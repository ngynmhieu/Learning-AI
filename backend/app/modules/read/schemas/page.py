"""Page persistence shapes — record/reorder requests + the stored-data response."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- requests (client → backend) -------------------------------------------

class PageRecord(BaseModel):
    """One already-uploaded file to record, as sent by `POST /read/sections/{id}/pages`.

    The frontend has already put the bytes in Storage (direct upload); this is
    only the metadata row for it.
    """
    storage_path: str = Field(..., min_length=1)
    position: int = Field(..., ge=0)
    width: int | None = None
    height: int | None = None


class ReorderRequest(BaseModel):
    """Body for `PATCH /read/sections/{id}/pages/order`.

    The new order, expressed as page ids — position is rewritten to each id's
    index in this list, in one transaction.
    """
    ordered_page_ids: list[uuid.UUID] = Field(..., min_length=1)


# --- responses (backend → client) ------------------------------------------

class PageInfo(BaseModel):
    """A stored page row — the reader resolves the actual bytes via signed URLs."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    storage_path: str
    position: int
    width: int | None = None
    height: int | None = None
    created_at: datetime
