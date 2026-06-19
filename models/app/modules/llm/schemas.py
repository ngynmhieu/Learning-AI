"""OpenAI-compatible request shapes (format only — the model is Qwen, run locally)."""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    # `protected_namespaces=()` silences pydantic's warning about the `model`
    # field; `extra="allow"` accepts model-specific params clients pass through.
    model_config = ConfigDict(protected_namespaces=(), extra="allow")

    model: str
    messages: List[ChatMessage]
    max_tokens: Optional[int] = None
    stream: bool = False
    temperature: Optional[float] = None  # accepted; not yet wired into generate

    def options(self) -> dict:
        """Model-specific passthrough params (e.g. enable_thinking) sent via
        extra_body — handed to the manager as keyword args."""
        return dict(self.model_extra or {})
