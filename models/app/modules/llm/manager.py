"""LLM model lifecycle and inference.

Reads the model configs in `models/*.json`, keeps one model resident on the GPU
(16 GB fits one), loads/unloads/swaps on demand, and runs generation. This is
where the transformers machinery lives — driven entirely by each model's JSON
config, so adding a model needs no code here.
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterator, List, Optional

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoModelForImageTextToText,
    AutoTokenizer,
    BitsAndBytesConfig,
    TextIteratorStreamer,
)

MessageDict = Dict[str, str]
MODELS_DIR = Path(__file__).resolve().parent / "models"


@dataclass(frozen=True)
class ModelConfig:
    """One model's settings, loaded from its JSON file."""
    id: str
    hf_repo: str
    quantize: str = "none"          # "4bit" | "8bit" | "none"
    max_new_tokens: int = 1024
    supports_thinking: bool = False
    description: str = ""
    default: bool = False

    @classmethod
    def from_file(cls, path: Path) -> "ModelConfig":
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            id=data["id"],
            hf_repo=data["hf_repo"],
            quantize=data.get("quantize", "none"),
            max_new_tokens=data.get("max_new_tokens", 1024),
            supports_thinking=data.get("supports_thinking", False),
            description=data.get("description", ""),
            default=data.get("default", False),
        )


def load_catalog() -> Dict[str, ModelConfig]:
    """Read every models/*.json into a {id: ModelConfig} map."""
    configs = [ModelConfig.from_file(p) for p in sorted(MODELS_DIR.glob("*.json"))]
    return {c.id: c for c in configs}


class LlmManager:
    def __init__(self) -> None:
        self._catalog: Dict[str, ModelConfig] = load_catalog()
        self._config: Optional[ModelConfig] = None
        self.tokenizer = None
        self.model = None
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

    def _unload_locked(self) -> None:
        self.model = None
        self.tokenizer = None
        self._config = None
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
    # Inference
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

    def generate(self, messages: List[MessageDict], max_new_tokens: int | None = None,
                 *, enable_thinking: bool = False, **_) -> str:
        enable_thinking = self._thinking(enable_thinking)
        max_new_tokens = max_new_tokens or self._config.max_new_tokens
        inputs = self._prepare(messages, enable_thinking)
        output = self.model.generate(**inputs, max_new_tokens=max_new_tokens)
        new_ids = output[0][len(inputs.input_ids[0]):].tolist()
        text = self.tokenizer.decode(new_ids, skip_special_tokens=True).strip("\n")
        if enable_thinking and "</think>" in text:
            text = text.split("</think>", 1)[1].strip("\n")
        return text

    def stream(self, messages: List[MessageDict], max_new_tokens: int | None = None,
               *, enable_thinking: bool = False, **_) -> Iterator[str]:
        enable_thinking = self._thinking(enable_thinking)
        max_new_tokens = max_new_tokens or self._config.max_new_tokens
        inputs = self._prepare(messages, enable_thinking)
        streamer = TextIteratorStreamer(
            self.tokenizer, skip_prompt=True, skip_special_tokens=True
        )
        gen_kwargs = dict(**inputs, max_new_tokens=max_new_tokens, streamer=streamer)

        error: list[BaseException | None] = [None]

        def _run() -> None:
            try:
                self.model.generate(**gen_kwargs)
            except BaseException as exc:  # surfaced after streaming
                error[0] = exc

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        for chunk in streamer:
            yield chunk
        thread.join()
        if error[0] is not None:
            raise error[0]


# Module-level singleton — one resident model for the service.
manager = LlmManager()
