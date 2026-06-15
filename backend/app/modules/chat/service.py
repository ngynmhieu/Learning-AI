"""Chat orchestration service — normalizes history and relays the models service."""
from typing import Any, Dict, Iterator, List, Tuple

from backend.app.shared.llm import LlmClient
from .schemas import Message

MessageDict = Dict[str, str]


class ChatService:
    """Orchestrates a conversation into a streamed response from the models service.

    Holds no model internals — it depends only on the injected LlmClient and turns
    API-shaped messages into the OpenAI message dict format.
    """

    def __init__(self, llm_client: LlmClient):
        self._llm = llm_client

    def _normalize_messages(self, messages: List[Message]) -> List[MessageDict]:
        return [{"role": message.role, "content": message.content} for message in messages]

    def stream_response(
        self,
        messages: List[Message],
        max_new_tokens: int | None = None,
        enable_thinking: bool = False,
        model: str | None = None,
    ) -> Iterator[Tuple[str, str]]:
        """Stream (type, chunk) tuples where type is 'thinking' or 'text'."""
        yield from self._llm.stream(
            messages=self._normalize_messages(messages),
            max_tokens=max_new_tokens,
            enable_thinking=enable_thinking,
            model=model,
        )

    def list_models(self) -> Dict[str, Any]:
        """Return the available models and their count."""
        models = self._llm.list_models()
        return {"count": len(models), "models": models}

    def health_check(self) -> Dict[str, Any]:
        return {"status": "ok", **self._llm.health()}
