"""HTTP endpoints for the llm module — thin; logic lives in LlmService."""
from fastapi import APIRouter, Depends

from .dependencies import get_llm_service
from .schemas import ChatCompletionRequest
from .service import LlmService

router = APIRouter()


@router.get("/health")
def health(service: LlmService = Depends(get_llm_service)):
    return service.health()


@router.get("/v1/models")
def list_models(service: LlmService = Depends(get_llm_service)):
    return service.list_models()


@router.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest, service: LlmService = Depends(get_llm_service)):
    return service.complete(req)
