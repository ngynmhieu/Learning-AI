"""Conversation persistence shapes — CRUD request + stored-data responses."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# --- requests (client → backend) -------------------------------------------

class RenameRequest(BaseModel):
    """Body for `PATCH /conversations/{id}`."""
    title: str = Field(..., min_length=1, max_length=200)


# --- responses (backend → client) ------------------------------------------

class ConversationMessage(BaseModel):
    """A stored message, returned when loading a conversation's history.

    The persisted counterpart of the inbound `ChatMessage` — adds the db id,
    optional thinking trace, and timestamp. `from_attributes` so it can be built
    straight from the ORM `Message`.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    thinking: Optional[str] = None
    created_at: datetime


class ConversationSummary(BaseModel):
    """A conversation as it appears in the sidebar list (no messages)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    updated_at: datetime


class ConversationDetail(ConversationSummary):
    """A conversation plus its full message history."""
    messages: List[ConversationMessage] = Field(default_factory=list)


class TitleResponse(BaseModel):
    """Body of `POST /conversations/{id}/title` — the (generated or fallback) title."""
    title: str
