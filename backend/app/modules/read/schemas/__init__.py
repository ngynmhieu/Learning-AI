"""Read module API-boundary schemas (request/response shapes), grouped by purpose.

This package is the module's schema **public surface** — import from
`modules.read.schemas`, not the submodules. Grouped by sub-domain so each request
sits next to the responses it relates to:

    manga.py     /read/mangas*                    MangaCreate, MangaUpdate (req)
                                                    MangaSummary, MangaDetail (resp)
    section.py   /read/mangas/{id}/sections*,     SectionCreate, SectionUpdate (req)
                 /read/sections/{id}              SectionSummary (resp)
    page.py      /read/sections/{id}/pages*       PageRecord, ReorderRequest (req)
                                                    PageInfo (resp)
    library.py   /read/library*,                  LibraryAssetRecord, OrganizeRequest,
                 /read/*/cover/from-library         CoverFromLibraryRequest (req)
                                                    LibraryAssetInfo (resp)
    scrape.py    /read/scrape, /read/*/import      ScrapeRequest, ImportRequest,
                                                    LibraryImportRequest (req)
                                                    ScrapeResult, ScrapeCandidate (resp)

Quick reference — which way does it cross the wire?

    Requests  (client → backend):  MangaCreate, MangaUpdate, SectionCreate, SectionUpdate,
                                    PageRecord, ReorderRequest, LibraryAssetRecord,
                                    OrganizeRequest, CoverFromLibraryRequest, ScrapeRequest,
                                    ImportRequest, LibraryImportRequest
    Responses (backend → client):  MangaSummary, MangaDetail, SectionSummary,
                                    PageInfo, LibraryAssetInfo, ScrapeResult,
                                    ScrapeCandidate
"""
from .library import CoverFromLibraryRequest, LibraryAssetInfo, LibraryAssetRecord, OrganizeRequest
from .manga import MangaCreate, MangaDetail, MangaSummary, MangaUpdate
from .page import PageInfo, PageRecord, ReorderRequest
from .scrape import ImportRequest, LibraryImportRequest, ScrapeCandidate, ScrapeRequest, ScrapeResult
from .section import SectionCreate, SectionSummary, SectionUpdate

__all__ = [
    # --- requests (client → backend) ---
    "MangaCreate",
    "MangaUpdate",
    "SectionCreate",
    "SectionUpdate",
    "PageRecord",
    "ReorderRequest",
    "LibraryAssetRecord",
    "OrganizeRequest",
    "CoverFromLibraryRequest",
    "ScrapeRequest",
    "ImportRequest",
    "LibraryImportRequest",
    # --- responses (backend → client) ---
    "MangaSummary",
    "MangaDetail",
    "SectionSummary",
    "PageInfo",
    "LibraryAssetInfo",
    "ScrapeResult",
    "ScrapeCandidate",
]
