"""Dependency providers — the read module's DI surface.

Both services need a DB session, the current user, and the shared Storage client
(built once during the app lifespan and stored on `app.state`) — the same shape as
`modules/chat/dependencies.py`.
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_session
from backend.app.modules.auth.dependencies import get_current_user
from backend.app.modules.auth.schemas import CurrentUser
from backend.app.shared.storage import StorageClient
from .repository import ReadRepository
from .services import ReadService, ScrapeService


def _get_storage_client(request: Request) -> StorageClient:
    storage = getattr(request.app.state, "storage_client", None)
    if storage is None:
        raise HTTPException(status_code=503, detail="Storage client not initialized")
    return storage


async def get_read_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ReadService:
    return ReadService(ReadRepository(session), user, _get_storage_client(request))


async def get_scrape_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ScrapeService:
    return ScrapeService(ReadRepository(session), user, _get_storage_client(request))
