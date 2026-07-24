"""Scrape/import shapes — fetch-and-pick, then import into a section or the pool.

Deliberately two requests (scrape, then import) so the user picks between them —
see `ScrapeService` in `backend/docs/modules/read.md`.
"""
from pydantic import BaseModel, ConfigDict, Field


# --- requests (client → backend) -------------------------------------------

class ScrapeRequest(BaseModel):
    """Body for `POST /read/scrape`."""
    url: str = Field(..., min_length=1)


class ImportRequest(BaseModel):
    """Body for `POST /read/sections/{id}/import` — the chosen, ordered URLs.

    `referer` should be the page URL originally scraped (from `ScrapeRequest.url`) —
    some sites hotlink-protect images on it, so the backend's download needs it too.
    """
    urls: list[str] = Field(..., min_length=1)
    referer: str | None = None


class LibraryImportRequest(BaseModel):
    """Body for `POST /read/library/import` — same as `ImportRequest`, but the
    destination is the pool (no section, no ordering — the pool is unordered)."""
    urls: list[str] = Field(..., min_length=1)
    referer: str | None = None


# --- responses (backend → client) ------------------------------------------

class ScrapeCandidate(BaseModel):
    """One candidate image found on the page, for the user to pick from."""
    model_config = ConfigDict(from_attributes=True)

    url: str
    width: int | None = None
    height: int | None = None


class ScrapeResult(BaseModel):
    """Body of `POST /read/scrape`'s response — no persistence yet."""
    candidates: list[ScrapeCandidate]
