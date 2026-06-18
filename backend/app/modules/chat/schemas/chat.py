"""Live-chat request shapes (client → backend) for `POST /chat`."""
import uuid
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """One message in an inbound chat history.

    Carries only role + content — no id/timestamp, because this is the *request*
    shape, not the stored shape (see `ConversationMessage` for what comes back).
    """
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Body for `POST /chat`."""
    messages: List[ChatMessage] = Field(..., description="History including the latest user message")
    max_tokens: Optional[int] = Field(None, description="Max tokens to generate (default if unset)")
    enable_thinking: Optional[bool] = Field(False, description="Enable extended thinking mode")
    model: Optional[str] = Field(None, description="Model id to use (falls back to the configured default)")
    conversation_id: Optional[uuid.UUID] = Field(
        None, description="Existing conversation to append to; omit to start a new one"
    )
