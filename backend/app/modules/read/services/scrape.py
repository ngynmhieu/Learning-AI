"""Scrape a page for candidate images, then import chosen ones — into a section or
the pool. Two requests, deliberately kept separate so the user can pick in between
(see `ScrapeService` in `backend/docs/modules/read.md`).
"""
import asyncio
import logging
import mimetypes
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx

from backend.app.modules.auth.schemas import CurrentUser
from backend.app.shared.storage import StorageClient
from .. import scraper
from ..repository import ReadRepository
from ..schemas import LibraryAssetInfo, PageInfo, ScrapeCandidate, ScrapeResult

logger = logging.getLogger(__name__)

DOWNLOAD_CONCURRENCY = 5

Download = tuple[bytes, str | None]  # (content, content_type)


class ScrapeService:
    def __init__(self, repo: ReadRepository, user: CurrentUser, storage: StorageClient):
        self._repo = repo
        self._user_id = uuid.UUID(user.id)
        self._storage = storage

    async def scrape(self, url: str) -> ScrapeResult:
        """Fetch + extract candidate image URLs. No persistence."""
        candidates = await scraper.scrape(url)
        return ScrapeResult(candidates=[ScrapeCandidate.model_validate(c) for c in candidates])

    async def import_into(
        self, section_id: uuid.UUID, urls: list[str], referer: str | None = None
    ) -> list[PageInfo] | None:
        """Download + upload each URL server-side (browsers can't fetch cross-origin/
        hotlink-protected images), under the section's own prefix, then record pages.
        A URL that fails to download is skipped, not fatal to the batch.
        """
        section = await self._repo.get_section(section_id, self._user_id)
        if section is None:
            return None

        start_position = await self._repo.count_pages(section_id)
        downloads = await self._download_all(urls, referer)

        rows = []
        for url, download in zip(urls, downloads):
            if download is None:
                continue
            content, content_type = download
            position = start_position + len(rows)
            path = (
                f"{self._user_id}/{section.manga_id}/{section_id}/"
                f"{position}-{uuid.uuid4()}{_extension(url, content_type)}"
            )
            await self._storage.upload(path, content, content_type)
            rows.append({"storage_path": path, "position": position})

        pages = await self._repo.insert_pages(section_id, rows)
        await self._repo.commit()
        return [PageInfo.model_validate(page) for page in pages]

    async def import_to_library(
        self, urls: list[str], referer: str | None = None
    ) -> list[LibraryAssetInfo]:
        """Same download as `import_into`, but into the pool: `{user_id}/_pool/...`,
        with no section and no ordering (the pool is unordered)."""
        downloads = await self._download_all(urls, referer)

        rows = []
        for url, download in zip(urls, downloads):
            if download is None:
                continue
            content, content_type = download
            path = f"{self._user_id}/_pool/{uuid.uuid4()}{_extension(url, content_type)}"
            await self._storage.upload(path, content, content_type)
            rows.append({"storage_path": path, "source_url": url})

        assets = await self._repo.insert_library_assets(self._user_id, rows)
        await self._repo.commit()
        return [LibraryAssetInfo.model_validate(asset) for asset in assets]

    async def _download_all(self, urls: list[str], referer: str | None) -> list[Download | None]:
        """Download every URL concurrently (bounded), preserving order; a failed
        download becomes None rather than aborting the whole batch."""
        semaphore = asyncio.Semaphore(DOWNLOAD_CONCURRENCY)

        async def _one(client: httpx.AsyncClient, url: str) -> Download | None:
            async with semaphore:
                try:
                    return await scraper.download_image(client, url, referer=referer)
                except httpx.HTTPError as exc:
                    logger.warning("skip %s: %s", url, exc)
                    return None

        async with httpx.AsyncClient(timeout=scraper.REQUEST_TIMEOUT) as client:
            return await asyncio.gather(*(_one(client, url) for url in urls))


def _extension(url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix
    if not suffix and content_type:
        suffix = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ""
    return suffix or ".jpg"
