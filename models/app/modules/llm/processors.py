"""Generation-shaping helpers for the two-phase (thinking → answer) flow.

These are the supporting pieces the engine drives during decoding:
  - PresencePenaltyLogitsProcessor: a presence penalty transformers lacks natively.
  - ThinkingBudgetProcessor: nudges the model toward </think> as the budget runs low.
  - CloseStripper: drops a trailing </think> out of the streamed thinking text.
"""
from __future__ import annotations

from typing import Iterator

import torch
from transformers import LogitsProcessor

THINK_CLOSE = "</think>"


class PresencePenaltyLogitsProcessor(LogitsProcessor):
    """OpenAI/vLLM-style presence penalty for raw transformers.

    transformers has no presence_penalty — only a multiplicative repetition_penalty
    that Unsloth recommends leaving *off* for Qwen3.5. This subtracts a flat penalty
    from the logit of any token already generated *after the prompt*, discouraging
    the repetition loops that drive Qwen3.5 into endless thinking. It deliberately
    skips the prompt span so words from the user's question aren't penalized.
    """
    def __init__(self, penalty: float, prompt_len: int) -> None:
        self._penalty = penalty
        self._prompt_len = prompt_len

    def __call__(self, input_ids: "torch.LongTensor", scores: "torch.FloatTensor") -> "torch.FloatTensor":
        generated = input_ids[:, self._prompt_len:]
        if generated.shape[1] == 0:
            return scores
        seen = torch.zeros_like(scores, dtype=torch.bool)
        seen.scatter_(1, generated, True)
        return scores - seen.to(scores.dtype) * self._penalty


class ThinkingBudgetProcessor(LogitsProcessor):
    """Gradually guides the model toward </think> as the thinking budget runs low.

    From warn_start (75% of budget) to the hard limit, the first token of </think>
    gets a linearly increasing boost — peaking at max_boost at the limit. This makes
    the model naturally wrap up its thought and emit </think> on its own terms, rather
    than being cut off mid-sentence by a hard stop. StopStringCriteria still fires
    when the tag appears, so this just shifts *when* that happens.

    Only the first token of </think> is boosted. Once the model commits to it, the KV
    cache makes the rest of the sequence very likely by continuation.
    """
    def __init__(self, close_token_id: int, budget: int,
                 warn_start: float = 0.75, max_boost: float = 15.0) -> None:
        self._close_id = close_token_id
        self._warn_at = int(budget * warn_start)
        self._remaining = budget - self._warn_at
        self._max_boost = max_boost
        self._count = 0

    def __call__(self, input_ids: "torch.LongTensor", scores: "torch.FloatTensor") -> "torch.FloatTensor":
        self._count += 1
        if self._count <= self._warn_at:
            return scores
        progress = min((self._count - self._warn_at) / max(self._remaining, 1), 1.0)
        scores[:, self._close_id] += progress * self._max_boost
        return scores


class CloseStripper:
    """Strips a trailing </think> tag out of the thinking stream.

    The thinking phase generates with a stop-string on </think>, so the streamer
    may emit that tag before generation halts. This buffers just enough of the
    tail to drop the tag (and never leak a partial one mid-stream).
    """
    def __init__(self) -> None:
        self._buf = ""

    def feed(self, chunk: str) -> Iterator[str]:
        self._buf += chunk
        if THINK_CLOSE in self._buf:
            head, _, _ = self._buf.partition(THINK_CLOSE)
            self._buf = ""
            if head:
                yield head
            return
        # Hold back a tail that could be the start of </think>.
        keep = len(THINK_CLOSE) - 1
        if len(self._buf) > keep:
            emit, self._buf = self._buf[:-keep], self._buf[-keep:]
            if emit:
                yield emit

    def flush(self) -> Iterator[str]:
        if THINK_CLOSE in self._buf:
            head, _, _ = self._buf.partition(THINK_CLOSE)
            self._buf = ""
            if head:
                yield head
        elif self._buf:
            yield self._buf
            self._buf = ""
