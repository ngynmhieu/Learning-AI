"""Section (volume/chapter) persistence shapes — CRUD request + stored-data responses."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --- requests (client → backend) -------------------------------------------

class SectionCreate(BaseModel):
    """Body for `POST /read/mangas/{id}/sections`."""
    kind: Literal["volume", "chapter"]
    number: float | None = None
    title: str | None = None


class SectionUpdate(BaseModel):
    """Body for `PATCH /read/sections/{id}` — all fields optional (partial update)."""
    cover_path: str | None = None


# --- responses (backend → client) ------------------------------------------

class SectionSummary(BaseModel):
    """A volume/chapter as it appears in its tab's grid."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    manga_id: uuid.UUID
    kind: Literal["volume", "chapter"]
    number: float | None = None
    title: str | None = None
    cover_path: str | None = None
    """Explicitly-set cover; falls back to `first_page_path` on the frontend when unset."""
    first_page_path: str | None = None
    created_at: datetime
