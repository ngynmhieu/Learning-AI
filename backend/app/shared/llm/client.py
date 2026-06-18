"""LLM client — talks to the standalone models service over an OpenAI-compatible API.

Replaces the old in-process `QwenService` engine. No model is loaded here and there
are no torch/transformers imports; this is a thin HTTP client pointed at
`settings.models_service_url`. The model runs entirely in the models service.
"""
from __future__ import annotations

from typing import AsyncIterator, Dict, List, Tuple

from openai import AsyncOpenAI

MessageDict = Dict[str, str]


class LlmClient:
    """Async client. All methods are coroutines/async generators so the blocking
    network I/O runs on the event loop's transport rather than freezing it — this is
    what lets the SSE stream flush each chunk as it arrives.
    """

    def __init__(self, base_url: str, model: str, api_key: str = "") -> None:
        self._model = model
        # The local models service ignores the key, but the SDK requires a string.
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key or "not-needed")

    def _create_kwargs(self, messages: List[MessageDict], max_tokens: int | None,
                       enable_thinking: bool, stream: bool, model: str | None = None) -> dict:
        kwargs: dict = {
            # Per-request model override; falls back to the configured default.
            "model": model or self._model,
            "messages": messages,
            "stream": stream,
            # Model-specific knobs ride along via extra_body (OpenAI passthrough).
            "extra_body": {"enable_thinking": enable_thinking},
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        return kwargs

    async def generate(self, messages: List[MessageDict], max_tokens: int | None = None,
                       enable_thinking: bool = False, model: str | None = None) -> Tuple[str, str]:
        """Returns (thinking, text). thinking is empty when enable_thinking=False."""
        resp = await self._client.chat.completions.create(
            **self._create_kwargs(messages, max_tokens, enable_thinking, stream=False, model=model)
        )
        extra = resp.choices[0].message.model_extra or {}
        thinking = extra.get("thinking", "") if enable_thinking else ""
        return (thinking, extra.get("text", ""))

    async def stream(self, messages: List[MessageDict], max_tokens: int | None = None,
                     enable_thinking: bool = False, model: str | None = None) -> AsyncIterator[Tuple[str, str]]:
        """Yields (type, chunk) tuples where type is 'thinking' or 'text'."""
        stream = await self._client.chat.completions.create(
            **self._create_kwargs(messages, max_tokens, enable_thinking, stream=True, model=model)
        )
        async for event in stream:
            extra = event.choices[0].delta.model_extra or {}
            thinking = extra.get("thinking")
            if thinking:
                yield ("thinking", thinking)
            text = extra.get("text")
            if text:
                yield ("text", text)

    async def list_models(self) -> List[dict]:
        """Return the models service catalog as plain dicts.

        The models service adds `description`/`loaded` beyond the OpenAI Model
        fields; the SDK surfaces those non-standard fields via `model_extra`.
        """
        resp = await self._client.models.list()
        return [
            {
                "id": model.id,
                "description": (model.model_extra or {}).get("description", ""),
                "loaded": (model.model_extra or {}).get("loaded", False),
            }
            for model in resp.data
        ]

    async def health(self) -> dict:
        """Report the configured model and whether the models service is reachable."""
        try:
            await self._client.models.list()
            reachable = True
        except Exception:
            reachable = False
        return {"models_service_reachable": reachable, "model": self._model}
