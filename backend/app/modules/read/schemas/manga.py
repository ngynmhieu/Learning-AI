"""Manga persistence shapes — CRUD request + stored-data responses."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .section import SectionSummary


# --- requests (client → backend) -------------------------------------------

class MangaCreate(BaseModel):
    """Body for `POST /read/mangas`."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class MangaUpdate(BaseModel):
    """Body for `PATCH /read/mangas/{id}` — all fields optional (partial update)."""
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    cover_path: str | None = None


# --- responses (backend → client) ------------------------------------------

class MangaSummary(BaseModel):
    """A manga as it appears in the library grid."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None = None
    cover_path: str | None = None
    created_at: datetime
    updated_at: datetime


class MangaDetail(MangaSummary):
    """A manga plus its volumes/chapters (the two tabs are just `kind` filters)."""
    sections: list[SectionSummary] = Field(default_factory=list)
