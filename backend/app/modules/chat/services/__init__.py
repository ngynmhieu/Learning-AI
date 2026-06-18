"""Service layer for the chat module — one scope per file, exposed here.

Three distinct responsibilities, deliberately kept as separate instances rather than
one catch-all service:

- ModelService (model.py) — model catalog + models-service health. Stateless; built
  once and held on app.state as a singleton.
- ConversationService (conversation.py) — conversation CRUD (list/get/rename/delete),
  scoped to the current user. No LLM involvement. Request-scoped.
- ChatService (chat.py) — process a chat turn: stream a reply and persist the
  exchange, titling new conversations. Request-scoped.

This __init__ is the package's public contract; import services from here, not from
the individual modules.
"""
from .chat import ChatService
from .conversation import ConversationService
from .model import ModelService

__all__ = ["ChatService", "ConversationService", "ModelService"]
