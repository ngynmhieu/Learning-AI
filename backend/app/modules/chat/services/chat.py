"""Chat turn processing — stream a reply and persist the exchange.

Request-scoped (built per request with a DB session + the current user + the LLM
client). Owns the streaming pipeline for one chat turn: resolve/create the
conversation, persist the user message, and stream the reply (persisting it once at
the end). Conversation CRUD and titling live in ConversationService; this service
writes only as part of processing a turn. Ownership is enforced here — every call is
scoped to `user.id`.

The LLM client is async, so streaming is a plain `async for` over `self._llm.stream`:
each chunk yields back to the event loop, which flushes the SSE event before the next
read — no threads or hand-off queues needed.
"""
import uuid
from typing import AsyncIterator, Dict, List

from backend.app.modules.auth.schemas import CurrentUser
from backend.app.shared.llm import LlmClient
from ..repository import ConversationRepository
from ..schemas import ChatMessage, ChatRequest

MessageDict = Dict[str, str]


class ChatService:
    TITLE_FALLBACK_LEN = 40

    def __init__(self, repo: ConversationRepository, llm_client: LlmClient, user: CurrentUser):
        self._repo = repo
        self._llm = llm_client
        self._user = user
        self._user_id = uuid.UUID(user.id)

    def _normalize_messages(self, messages: List[ChatMessage]) -> List[MessageDict]:
        return [{"role": message.role, "content": message.content} for message in messages]

    def _latest_user_text(self, messages: List[ChatMessage]) -> str:
        for message in reversed(messages):
            if message.role == "user":
                return message.content
        return ""

    def _fallback_title(self, user_text: str) -> str:
        trimmed = user_text.strip().replace("\n", " ")
        if len(trimmed) > self.TITLE_FALLBACK_LEN:
            trimmed = trimmed[: self.TITLE_FALLBACK_LEN].rstrip() + "…"
        return trimmed or "New conversation"

    async def stream_and_persist(self, request: ChatRequest) -> AsyncIterator[dict]:
        """Persist the user message, then stream + persist the reply.

        Yields wire events: meta (conversation id) → thinking/text chunks → done. Any
        failure yields an error event and rolls back. New conversations are created
        (upserted on the client-provided id) with a fallback title; the real title is
        generated out-of-band by the frontend via POST /conversations/{id}/title once
        the stream ends.
        """
        try:
            first_user = self._latest_user_text(request.messages)

            # The id is minted by the frontend, so a first message arrives with an id we
            # don't have yet — create it (upsert). An existing id appends to that thread.
            conversation = None
            if request.conversation_id is not None:
                conversation = await self._repo.get(request.conversation_id, self._user_id)
            if conversation is None:
                conversation = await self._repo.create(
                    self._user_id,
                    self._fallback_title(first_user),
                    conversation_id=request.conversation_id,
                )

            # Persist only the latest user message (history is already stored).
            latest = request.messages[-1]
            await self._repo.add_message(conversation.id, latest.role, latest.content)
            await self._repo.commit()
            yield {"type": "meta", "conversation_id": str(conversation.id)}

            answer_parts: List[str] = []
            thinking_parts: List[str] = []
            async for kind, chunk in self._llm.stream(
                messages=self._normalize_messages(request.messages),
                max_tokens=request.max_tokens,
                enable_thinking=request.enable_thinking or False,
                model=request.model,
            ):
                (thinking_parts if kind == "thinking" else answer_parts).append(chunk)
                yield {"type": kind, "chunk": chunk}

            answer = "".join(answer_parts)
            thinking = "".join(thinking_parts)
            await self._repo.add_message(conversation.id, "assistant", answer, thinking or None)
            await self._repo.commit()

            yield {"done": True}
        except Exception as exc:  # surface as a stream event, like the old handler
            await self._repo.rollback()
            yield {"error": str(exc)}
