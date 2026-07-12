"""Shared streaming-collect orchestration — reused by `ScrapeService` (scrape
import) and `ReadService` (upload record), the two ways images land in the
pool. See `backend/docs/modules/read.md` → *The pool lifecycle* and
`ReadRepository.reserve_library_asset_slots`/`fill_library_asset`.
"""
import asyncio
import logging
import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable, Sequence
from typing import TypeVar

from fastapi import HTTPException

from ..repository import ReadRepository
from ..schemas import LibraryAssetInfo, LibraryStreamItem

logger = logging.getLogger(__name__)

T = TypeVar("T")

# item -> {storage_path, width, height}; raises on failure (that item's error,
# not fatal to its siblings).
Prepare = Callable[[T], Awaitable[dict]]


async def stream_collect(
    repo: ReadRepository,
    user_id: uuid.UUID,
    items: Sequence[T],
    concurrency: int,
    source_url: Callable[[T], str | None],
    prepare: Prepare,
) -> AsyncGenerator[bytes, None]:
    """Reserve every item's slot (position fixed, real row, `storage_path` still
    NULL) in one upfront step, then run `prepare` concurrently (bounded) and
    stream each result — as its own NDJSON line — the moment it's ready, in
    whatever order items actually finish. A failed item's reserved slot is
    dropped rather than left half-filled.
    """
    if not items:
        return
    asset_ids = await repo.reserve_library_asset_slots(user_id, [source_url(item) for item in items])

    semaphore = asyncio.Semaphore(concurrency)
    # The request-scoped AsyncSession is one asyncpg connection — concurrent
    # tasks calling flush()/commit() on it simultaneously will race. This lock
    # only wraps the cheap DB write; the slow prepare() (download/upload) still
    # runs fully concurrently.
    write_lock = asyncio.Lock()

    async def _run(index: int, item: T) -> LibraryStreamItem:
        asset_id = asset_ids[index]
        try:
            async with semaphore:
                fields = await prepare(item)
            async with write_lock:
                asset = await repo.fill_library_asset(asset_id, fields)
                await repo.commit()
        except Exception as exc:
            detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
            logger.warning("collect item %d failed: %s", index, detail)
            async with write_lock:
                await repo.delete_library_assets([asset_id], user_id)
                await repo.commit()
            return LibraryStreamItem(index=index, ok=False, error=str(detail))
        return LibraryStreamItem(index=index, ok=True, asset=LibraryAssetInfo.model_validate(asset))

    tasks = [asyncio.ensure_future(_run(i, item)) for i, item in enumerate(items)]
    for coro in asyncio.as_completed(tasks):
        yield (await coro).model_dump_json().encode() + b"\n"
