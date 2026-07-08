"""Library-pool persistence shapes — the staging area for unassigned images.

See `supabase/docs/modules/read.md` → `library_assets` and
`backend/docs/modules/read.md` → *The pool lifecycle*.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- requests (client → backend) -------------------------------------------

class LibraryAssetRecord(BaseModel):
    """One already-uploaded pool file to record, as sent by `POST /read/library`.

    The frontend has already put the bytes in Storage (direct upload, under
    `{user_id}/_pool/...`); this is only the metadata row for it.
    """
    storage_path: str = Field(..., min_length=1)
    source_url: str | None = None
    width: int | None = None
    height: int | None = None


class OrganizeRequest(BaseModel):
    """Body for `POST /read/sections/{id}/pages/from-library`.

    The chosen pool assets, in the order they should become pages — each becomes
    a `manga_pages` row (reusing its existing Storage object) and is removed from
    the pool, in one transaction.
    """
    asset_ids: list[uuid.UUID] = Field(..., min_length=1)


# --- responses (backend → client) ------------------------------------------

class LibraryAssetInfo(BaseModel):
    """A stored pool asset — the pool grid resolves bytes via signed URLs."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    storage_path: str
    source_url: str | None = None
    width: int | None = None
    height: int | None = None
    created_at: datetime
