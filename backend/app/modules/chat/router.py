"""HTTP routes for the chat module — thin orchestration only."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from .schemas import (
    ChatRequest,
    ConversationDetail,
    ConversationSummary,
    ModelsResponse,
    RenameRequest,
    TitleResponse,
)
from .services import ChatService, ConversationService, ModelService
from .dependencies import get_chat_service, get_conversation_service, get_model_service

router = APIRouter(tags=["chat"])


@router.get("/health")
async def health_check(model_service: ModelService = Depends(get_model_service)):
    return await model_service.health_check()


@router.get("/models", response_model=ModelsResponse)
async def list_models(model_service: ModelService = Depends(get_model_service)):
    return await model_service.list_models()


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(service: ConversationService = Depends(get_conversation_service)):
    return await service.list_conversations()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    service: ConversationService = Depends(get_conversation_service),
):
    conversation = await service.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.patch("/conversations/{conversation_id}", status_code=204)
async def rename_conversation(
    conversation_id: uuid.UUID,
    body: RenameRequest,
    service: ConversationService = Depends(get_conversation_service),
):
    if not await service.rename_conversation(conversation_id, body.title):
        raise HTTPException(status_code=404, detail="Conversation not found")


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: uuid.UUID,
    service: ConversationService = Depends(get_conversation_service),
):
    if not await service.delete_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")


@router.post("/conversations/{conversation_id}/title", response_model=TitleResponse)
async def generate_title(
    conversation_id: uuid.UUID,
    service: ConversationService = Depends(get_conversation_service),
):
    """Generate + persist a title from the conversation's messages (off the chat path)."""
    title = await service.generate_title(conversation_id)
    if title is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return TitleResponse(title=title)


@router.post("/chat")
async def chat(
    request: ChatRequest,
    service: ChatService = Depends(get_chat_service),
):
    async def event_stream():
        async for event in service.stream_and_persist(request):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
