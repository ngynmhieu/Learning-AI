"""FastAPI dependency providers for the llm module."""
from .manager import manager
from .service import LlmService

_service = LlmService(manager)


def get_llm_service() -> LlmService:
    return _service
