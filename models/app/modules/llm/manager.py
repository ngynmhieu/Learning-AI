"""LLM model lifecycle and inference.

Keeps one model resident on the GPU (16 GB fits one), loads/unloads/swaps on
demand, and runs the two-phase (thinking -> answer) generation. Configuration
lives in config.py and the decoding helpers in processors.py; everything that
needs the live model + tokenizer lives here.

Two-phase flow (when thinking is enabled):
  Phase 1 — generate the <think> block, capped at max_thinking_tokens, stopping at
            </think>. ThinkingBudgetProcessor nudges it to close before the cap.
  Phase 2 — generate the answer from the closed sequence, with its own full budget.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, Iterator, List, Optional, Tuple

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoModelForImageTextToText,
    AutoTokenizer,
    BitsAndBytesConfig,
    LogitsProcessorList,
    StoppingCriteriaList,
    StopStringCriteria,
    TextIteratorStreamer,
)

from .config import ModelConfig, load_catalog
from .processors import (
    THINK_CLOSE,
    CloseStripper,
    PresencePenaltyLogitsProcessor,
    ThinkingBudgetProcessor,
)

MessageDict = Dict[str, str]


@dataclass(frozen=True)
class GenerateResult:
    """Structured output from generate() — thinking and text as separate fields."""
    thinking: str  # empty when thinking was disabled or model skipped <think>
    text: str


class LlmManager:
    def __init__(self) -> None:
        self._catalog: Dict[str, ModelConfig] = load_catalog()
        self._config: Optional[ModelConfig] = None
        self.tokenizer = None
        self.model = None
        self._close_token_id: Optional[int] = None  # first token of </think>, cached at load
        # Serializes swaps so a load can't race an in-flight generation.
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Catalog
    # ------------------------------------------------------------------ #

    def list_configs(self) -> List[ModelConfig]:
        return list(self._catalog.values())

    def default_id(self) -> Optional[str]:
        for cfg in self._catalog.values():
            if cfg.default:
                return cfg.id
        return next(iter(self._catalog), None)  # fall back to first if none marked

    @property
    def current_model_id(self) -> Optional[str]:
        return self._config.id if self._config else None

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    def ensure(self, model_id: str) -> None:
        """Make `model_id` the resident model, swapping out the current one."""
        with self._lock:
            if model_id not in self._catalog:
                raise KeyError(model_id)
            if self._config and self._config.id == model_id:
                return
            if self.model is not None:
                self._unload_locked()
            self._load_locked(self._catalog[model_id])

    def load_default(self) -> None:
        model_id = self.default_id()
        if model_id:
            self.ensure(model_id)

    def unload(self) -> None:
        with self._lock:
            self._unload_locked()

    def _load_locked(self, cfg: ModelConfig) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(cfg.hf_repo)

        kwargs: dict = dict(device_map="auto", trust_remote_code=True)
        if cfg.quantize == "4bit":
            kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
                bnb_4bit_compute_dtype=torch.float16,
            )
        elif cfg.quantize == "8bit":
            kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
        else:
            kwargs["torch_dtype"] = "auto"

        self.model = self._auto_from_pretrained(cfg.hf_repo, **kwargs)
        self._config = cfg
        close_ids = self.tokenizer(THINK_CLOSE, add_special_tokens=False).input_ids
        self._close_token_id = int(close_ids[0]) if close_ids else None

    def _unload_locked(self) -> None:
        self.model = None
        self.tokenizer = None
        self._config = None
        self._close_token_id = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    @staticmethod
    def _auto_from_pretrained(repo: str, **kwargs):
        """Newer Qwen ship as multimodal *ForConditionalGeneration and aren't
        registered under AutoModelForCausalLM — try image-text-to-text first."""
        try:
            return AutoModelForImageTextToText.from_pretrained(repo, **kwargs)
        except (ValueError, KeyError):
            return AutoModelForCausalLM.from_pretrained(repo, **kwargs)

    # ------------------------------------------------------------------ #
    # Inference — setup helpers
    # ------------------------------------------------------------------ #

    def _thinking(self, enable_thinking: bool) -> bool:
        return bool(enable_thinking) and bool(self._config and self._config.supports_thinking)

    def _prepare(self, messages: List[MessageDict], enable_thinking: bool):
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=enable_thinking,
        )
        return self.tokenizer([text], return_tensors="pt").to(self.model.device)

    def _run_stream(self, gen_kwargs: dict, holder: dict) -> Iterator[str]:
        """Run model.generate in a thread, yield decoded text chunks, and store the
        full output sequence in holder['out'] once exhausted (for a follow-on phase)."""
        streamer = TextIteratorStreamer(
            self.tokenizer, skip_prompt=True, skip_special_tokens=True
        )
        error: list[BaseException | None] = [None]

        def _run() -> None:
            try:
                holder["out"] = self.model.generate(streamer=streamer, **gen_kwargs)
            except BaseException as exc:  # surfaced after streaming
                error[0] = exc

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        for chunk in streamer:
            yield chunk
        thread.join()
        if error[0] is not None:
            raise error[0]

    def _append_close(self, seq):
        """Force-close an over-budget thinking block with the configured wrap-up
        message (a natural-language nudge + </think>), rather than a cold tag."""
        close_ids = self.tokenizer(
            self._config.thinking_budget_message,
            add_special_tokens=False, return_tensors="pt",
        ).input_ids.to(seq.device)
        return torch.cat([seq, close_ids], dim=-1)

    def _sampling_kwargs(self) -> dict:
        """generate() kwargs for the configured sampler (empty → greedy default)."""
        s = self._config.sampling
        if s is None:
            return {}
        return dict(
            do_sample=True,
            temperature=s.temperature,
            top_p=s.top_p,
            top_k=s.top_k,
            min_p=s.min_p,
        )

    def _make_processors(self, prompt_len: int,
                         thinking_budget: Optional[int] = None) -> Optional[LogitsProcessorList]:
        """Build the logits processor list for a generate() call.

        presence_penalty: applied to all generated tokens after prompt_len.
        thinking_budget:  when set (Phase 1 only), adds a ThinkingBudgetProcessor
                          that ramps up the </think> boost as the budget runs low.
        """
        processors = []
        s = self._config.sampling
        if s and s.presence_penalty > 0:
            processors.append(PresencePenaltyLogitsProcessor(s.presence_penalty, prompt_len))
        if thinking_budget is not None and self._close_token_id is not None:
            processors.append(ThinkingBudgetProcessor(self._close_token_id, thinking_budget))
        return LogitsProcessorList(processors) if processors else None

    # ------------------------------------------------------------------ #
    # Inference — entry points
    # ------------------------------------------------------------------ #

    def generate(self, messages: List[MessageDict], max_new_tokens: int | None = None,
                 *, enable_thinking: bool = False, **_) -> GenerateResult:
        enable_thinking = self._thinking(enable_thinking)
        answer_budget = max_new_tokens or self._config.max_new_tokens
        inputs = self._prepare(messages, enable_thinking)
        prompt_len = inputs.input_ids.shape[1]

        if not enable_thinking:
            out = self.model.generate(
                **inputs, max_new_tokens=answer_budget,
                **self._sampling_kwargs(),
                logits_processor=self._make_processors(prompt_len),
            )
            text = self.tokenizer.decode(
                out[0][prompt_len:], skip_special_tokens=True
            ).strip("\n")
            return GenerateResult(thinking="", text=text)

        # Phase 1 — thinking, capped at its own budget, stopping at </think>.
        # ThinkingBudgetProcessor guides the model to close gracefully before the hard limit.
        stop = StoppingCriteriaList([StopStringCriteria(self.tokenizer, [THINK_CLOSE])])
        think_budget = self._config.max_thinking_tokens
        out1 = self.model.generate(
            **inputs, max_new_tokens=think_budget, stopping_criteria=stop,
            **self._sampling_kwargs(),
            logits_processor=self._make_processors(prompt_len, thinking_budget=think_budget),
        )
        think_raw = self.tokenizer.decode(
            out1[0][prompt_len:], skip_special_tokens=True
        )
        thinking = think_raw.partition(THINK_CLOSE)[0].replace("<think>", "", 1).strip()
        seq = out1 if THINK_CLOSE in think_raw else self._append_close(out1)

        # Phase 2 — the answer, with its own full budget.
        out2 = self.model.generate(
            input_ids=seq, attention_mask=torch.ones_like(seq), max_new_tokens=answer_budget,
            **self._sampling_kwargs(),
            logits_processor=self._make_processors(seq.shape[1]),
        )
        text = self.tokenizer.decode(
            out2[0][seq.shape[1]:], skip_special_tokens=True
        ).strip("\n")
        return GenerateResult(thinking=thinking, text=text)

    def stream(self, messages: List[MessageDict], max_new_tokens: int | None = None,
               *, enable_thinking: bool = False, **_) -> Iterator[Tuple[str, str]]:
        enable_thinking = self._thinking(enable_thinking)
        answer_budget = max_new_tokens or self._config.max_new_tokens
        inputs = self._prepare(messages, enable_thinking)
        prompt_len = inputs.input_ids.shape[1]

        if not enable_thinking:
            holder: dict = {}
            for chunk in self._run_stream(
                dict(**inputs, max_new_tokens=answer_budget,
                     **self._sampling_kwargs(),
                     logits_processor=self._make_processors(prompt_len)),
                holder,
            ):
                yield ("text", chunk)
            return

        # Phase 1 — thinking, capped, stopping at </think>; tag every chunk "thinking".
        # ThinkingBudgetProcessor ramps up the </think> boost from 75% of budget onward.
        stop = StoppingCriteriaList([StopStringCriteria(self.tokenizer, [THINK_CLOSE])])
        think_budget = self._config.max_thinking_tokens
        holder1: dict = {}
        stripper = CloseStripper()
        for chunk in self._run_stream(
            dict(**inputs, max_new_tokens=think_budget,
                 stopping_criteria=stop,
                 **self._sampling_kwargs(),
                 logits_processor=self._make_processors(prompt_len, thinking_budget=think_budget)),
            holder1,
        ):
            for piece in stripper.feed(chunk):
                yield ("thinking", piece)
        for piece in stripper.flush():
            yield ("thinking", piece)

        # Bridge: force-close the thinking block if the budget cut it off.
        seq = holder1["out"]
        think_raw = self.tokenizer.decode(
            seq[0][prompt_len:], skip_special_tokens=True
        )
        if THINK_CLOSE not in think_raw:
            seq = self._append_close(seq)

        # Phase 2 — the answer, with its own full budget; tag every chunk "text".
        holder2: dict = {}
        for chunk in self._run_stream(
            dict(input_ids=seq, attention_mask=torch.ones_like(seq),
                 max_new_tokens=answer_budget,
                 **self._sampling_kwargs(),
                 logits_processor=self._make_processors(seq.shape[1])),
            holder2,
        ):
            yield ("text", chunk)


# Module-level singleton — one resident model for the service.
manager = LlmManager()
