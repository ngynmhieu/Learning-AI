"""LLM client — talks to the standalone models service over an OpenAI-compatible API.

Replaces the old in-process `QwenService` engine. No model is loaded here and there
are no torch/transformers imports; this is a thin HTTP client pointed at
`settings.models_service_url`. The model runs entirely in the models service.
"""
from __future__ import annotations

from typing import Dict, Iterator, List

from openai import OpenAI

MessageDict = Dict[str, str]


class LlmClient:
    def __init__(self, base_url: str, model: str, api_key: str = "") -> None:
        self._model = model
        # The local models service ignores the key, but the SDK requires a string.
        self._client = OpenAI(base_url=base_url, api_key=api_key or "not-needed")

    def _create_kwargs(self, messages: List[MessageDict], max_tokens: int | None,
                       enable_thinking: bool, stream: bool) -> dict:
        kwargs: dict = {
            "model": self._model,
            "messages": messages,
            "stream": stream,
            # Model-specific knobs ride along via extra_body (OpenAI passthrough).
            "extra_body": {"enable_thinking": enable_thinking},
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        return kwargs

    def generate(self, messages: List[MessageDict], max_tokens: int | None = None,
                 enable_thinking: bool = False) -> str:
        resp = self._client.chat.completions.create(
            **self._create_kwargs(messages, max_tokens, enable_thinking, stream=False)
        )
        return resp.choices[0].message.content or ""

    def stream(self, messages: List[MessageDict], max_tokens: int | None = None,
               enable_thinking: bool = False) -> Iterator[str]:
        stream = self._client.chat.completions.create(
            **self._create_kwargs(messages, max_tokens, enable_thinking, stream=True)
        )
        for event in stream:
            delta = event.choices[0].delta.content
            if delta:
                yield delta

    def health(self) -> dict:
        """Report the configured model and whether the models service is reachable."""
        try:
            self._client.models.list()
            reachable = True
        except Exception:
            reachable = False
        return {"models_service_reachable": reachable, "model": self._model}
