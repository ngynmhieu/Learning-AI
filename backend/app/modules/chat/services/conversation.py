"""Conversation management — CRUD + titling over stored conversations, per user.

Request-scoped (built per request with a DB session + the current user + the LLM
client). Mostly pure storage (list, read, rename, delete); `generate_title` is the
one operation that calls the LLM — titling is conversation metadata, so it lives
here next to `rename_conversation` rather than on the chat-streaming path. Ownership
is enforced here: every query is scoped to `user.id`.
"""
import uuid
from typing import List

from backend.app.modules.auth.schemas import CurrentUser
from backend.app.shared.llm import LlmClient
from ..repository import ConversationRepository
from ..schemas import ConversationDetail, ConversationMessage, ConversationSummary


class ConversationService:
    def __init__(self, repo: ConversationRepository, user: CurrentUser, llm_client: LlmClient):
        self._repo = repo
        self._user_id = uuid.UUID(user.id)
        self._llm = llm_client

    async def list_conversations(self) -> List[ConversationSummary]:
        return await self._repo.list_for_user(self._user_id)

    async def get_conversation(self, conversation_id: uuid.UUID) -> ConversationDetail | None:
        conversation = await self._repo.get(conversation_id, self._user_id)
        if conversation is None:
            return None
        messages = await self._repo.get_messages(conversation_id)
        return ConversationDetail(
            id=conversation.id,
            title=conversation.title,
            updated_at=conversation.updated_at,
            messages=[ConversationMessage.model_validate(message) for message in messages],
        )

    async def rename_conversation(self, conversation_id: uuid.UUID, title: str) -> bool:
        renamed = await self._repo.rename(conversation_id, self._user_id, title.strip() or "Untitled")
        if renamed:
            await self._repo.commit()
        return renamed

    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        deleted = await self._repo.delete(conversation_id, self._user_id)
        if deleted:
            await self._repo.commit()
        return deleted

    async def generate_title(self, conversation_id: uuid.UUID) -> str | None:
        """Generate + persist a title from a conversation's stored messages.

        Its own entry point (POST /conversations/{id}/title), called by the frontend
        once the chat stream ends — kept off the streaming path so it never delays a
        reply. Returns the new title, or the existing fallback if generation yields
        nothing; returns None only when the conversation isn't found.
        """
        conversation = await self._repo.get(conversation_id, self._user_id)
        if conversation is None:
            return None
        messages = await self._repo.get_messages(conversation_id)
        user_text = next((m.content for m in messages if m.role == "user"), "")
        assistant_text = next((m.content for m in messages if m.role == "assistant"), "")

        title = await self._make_title(user_text, assistant_text)
        if title:
            await self._repo.rename(conversation_id, self._user_id, title)
            await self._repo.commit()
            return title
        return conversation.title  # keep the fallback already stored

    async def _make_title(self, user_text: str, assistant_text: str) -> str | None:
        """Ask the model for a short title; return None to keep the fallback."""
        try:
            prompt = (
                "Create a short title (6 words max) for this conversation. "
                "Reply with ONLY the title — no quotes, no trailing punctuation.\n\n"
                f"User: {user_text[:500]}\nAssistant: {assistant_text[:500]}"
            )
            _, text = await self._llm.generate(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=24,
                enable_thinking=False,
            )
            title = text.strip().strip('"').splitlines()[0][:80] if text else ""
            return title or None
        except Exception:
            return None
