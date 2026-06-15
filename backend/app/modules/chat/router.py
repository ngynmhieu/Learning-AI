"""HTTP routes for the chat module — thin orchestration only."""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import json

from .schemas import ChatRequest, ModelsResponse
from .service import ChatService
from .dependencies import get_chat_service

router = APIRouter(tags=["chat"])


@router.get("/health")
async def health_check(chat_service: ChatService = Depends(get_chat_service)):
    return chat_service.health_check()


@router.get("/models", response_model=ModelsResponse)
async def list_models(chat_service: ChatService = Depends(get_chat_service)):
    return chat_service.list_models()


@router.post("/chat")
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
):
    def stream_generator():
        try:
            for chunk_type, chunk_text in chat_service.stream_response(
                messages=request.messages,
                max_new_tokens=request.max_tokens,
                enable_thinking=request.enable_thinking or False,
                model=request.model,
            ):
                yield f"data: {json.dumps({'type': chunk_type, 'chunk': chunk_text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
