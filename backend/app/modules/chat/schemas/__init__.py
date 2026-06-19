"""Chat module API-boundary schemas (request/response shapes), grouped by purpose.

This package is the module's schema **public surface** — import from
`modules.chat.schemas`, not the submodules. Grouped by sub-domain so each request
sits next to the responses it relates to:

    chat.py          POST /chat            ChatMessage, ChatRequest
    conversation.py  /conversations*       RenameRequest (request)
                                           ConversationMessage, ConversationSummary,
                                           ConversationDetail, TitleResponse (responses)
    model.py         GET /models           ModelInfo, ModelsResponse (responses)

Quick reference — which way does it cross the wire?

    Requests  (client → backend):  ChatRequest, RenameRequest  (+ ChatMessage item)
    Responses (backend → client):  ModelsResponse, ModelInfo,
                                    ConversationSummary, ConversationDetail,
                                    ConversationMessage, TitleResponse
"""
from .chat import ChatMessage, ChatRequest
from .conversation import (
    ConversationDetail,
    ConversationMessage,
    ConversationSummary,
    RenameRequest,
    TitleResponse,
)
from .model import ModelInfo, ModelsResponse

__all__ = [
    # --- requests (client → backend) ---
    "ChatRequest",
    "ChatMessage",
    "RenameRequest",
    # --- responses (backend → client) ---
    "ModelsResponse",
    "ModelInfo",
    "ConversationSummary",
    "ConversationDetail",
    "ConversationMessage",
    "TitleResponse",
]
