"""Dependency providers — the chat module's DI surface.

Three services, three providers, matching the three scopes:
- `get_model_service` returns the singleton ModelService (model catalog + health),
  built once during the app lifespan and stored on `app.state`.
- `get_conversation_service` builds a request-scoped ConversationService for
  conversation CRUD + titling (needs the DB session, the current user, and — for
  `generate_title` — the LLM client).
- `get_chat_service` builds a request-scoped ChatService for processing a chat turn
  (needs the DB session, the current user, and the LLM client).
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_session
from backend.app.modules.auth.dependencies import get_current_user
from backend.app.modules.auth.schemas import CurrentUser
from .repository import ConversationRepository
from .services import ChatService, ConversationService, ModelService


def get_model_service(request: Request) -> ModelService:
    service = getattr(request.app.state, "model_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="Model service not initialized")
    return service


async def get_conversation_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ConversationService:
    llm_client = getattr(request.app.state, "llm_client", None)
    if llm_client is None:
        raise HTTPException(status_code=503, detail="LLM client not initialized")
    return ConversationService(ConversationRepository(session), user, llm_client)


async def get_chat_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ChatService:
    llm_client = getattr(request.app.state, "llm_client", None)
    if llm_client is None:
        raise HTTPException(status_code=503, detail="LLM client not initialized")
    return ChatService(ConversationRepository(session), llm_client, user)
