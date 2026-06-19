# Module: `chat`

> Per-module architecture doc. Mirrors how the frontend documents each module.
> Read `../backend_guidelines.md` first for the rules that govern every module.

## Responsibility

The `chat` module owns two business capabilities:

1. **Turning a conversation history into a streamed LLM response** — receives chat
   requests over HTTP, calls the standalone **models service** over HTTP, and
   streams tokens back as Server-Sent Events.
2. **Persisting conversations** — every chat is stored as a `conversation` (titled,
   ordered list of `messages`) owned by the signed-in user, so it can be listed,
   reopened, renamed, deleted, and titled.

It does **not** own:
- The model loading/inference internals → that is the standalone **models service**;
  the backend reaches it only through the `shared/llm/` `LlmClient`.
- Configuration → `core/config.py`.
- Authentication / "who is the user" → `modules/auth`'s public surface
  (`get_current_user`).

---

## Structure

```
backend/app/modules/chat/
├── __init__.py
├── router.py            # HTTP endpoints: /health, /models, /conversations*, /chat
├── repository.py        # ConversationRepository — all DB access (conversations/messages)
├── models.py             # Conversation, Message ORM (Supabase-migrated tables)
├── dependencies.py       # DI: get_model_service / get_conversation_service / get_chat_service
├── schemas/              # API-boundary shapes, grouped by purpose (package)
│   ├── __init__.py       #   public surface — re-exports all; lists request vs response
│   ├── chat.py           #   ChatMessage, ChatRequest                              (request)
│   ├── conversation.py   #   RenameRequest (req) · ConversationMessage/Summary/    (resp)
│   │                     #   Detail/TitleResponse
│   └── model.py          #   ModelInfo, ModelsResponse                            (response)
└── services/             # Service layer — one scope per file, grouped under one package
    ├── __init__.py       #   public surface — re-exports all three
    ├── chat.py           #   ChatService — stream a turn + persist the exchange
    ├── conversation.py   #   ConversationService — CRUD + titling
    └── model.py          #   ModelService — model catalog + health (singleton)
```

---

## File-by-File

### `router.py` — HTTP boundary (thin)
Holds the `APIRouter(tags=["chat"])` (no path prefix). Every handler resolves its
service via `Depends` and delegates — no branching logic lives here:

| Method & path | Service call |
|---|---|
| `GET /health` | `ModelService.health_check()` |
| `GET /models` | `ModelService.list_models()` |
| `GET /conversations` | `ConversationService.list_conversations()` |
| `GET /conversations/{id}` | `ConversationService.get_conversation(id)` → 404 if not owned |
| `PATCH /conversations/{id}` | `ConversationService.rename_conversation(id, title)` → 404 if not owned |
| `DELETE /conversations/{id}` | `ConversationService.delete_conversation(id)` → 404 if not owned |
| `POST /conversations/{id}/title` | `ConversationService.generate_title(id)` → 404 if not owned |
| `POST /chat` | `ChatService.stream_and_persist(request)` → `StreamingResponse` over SSE |

### `services/model.py` — `ModelService` (singleton)
Stateless relay over the injected `LlmClient`: `list_models()` (catalog + count) and
`health_check()`. Built once during the app lifespan and stored on `app.state` —
the only one of the three services that isn't request-scoped (it holds no DB
session or per-user state).

### `services/conversation.py` — `ConversationService` (request-scoped)
CRUD + titling over stored conversations, scoped to `user.id` on every query:
`list_conversations`, `get_conversation`, `rename_conversation`,
`delete_conversation`, and `generate_title` (the one method that calls the LLM —
see *Titling* below).

### `services/chat.py` — `ChatService` (request-scoped)
Owns the streaming pipeline for one chat turn: resolve-or-create the conversation,
persist the user message, stream the reply, persist the assistant message once the
stream ends. See *Conversation id lifecycle* below for how the id is resolved.

### `repository.py` — `ConversationRepository`
All DB access for both tables. Every method takes/filters `user_id` (ownership is
enforced here, not by RLS — see the caveat below):

- `list_for_user(user_id)` → summaries, newest `updated_at` first.
- `get(conversation_id, user_id)` → `None` if not owned.
- `get_messages(conversation_id)` → ordered by `created_at`.
- `create(user_id, title, conversation_id=None)` → inserts a row; if
  `conversation_id` is given (the normal case — see below) it's set explicitly
  before flush, otherwise the ORM's Python-side `default=uuid.uuid4` applies.
- `add_message(conversation_id, role, content, thinking=None)` → inserts + bumps
  the parent conversation's `updated_at` (so the sidebar re-sorts it to the top).
- `rename(conversation_id, user_id, title)` / `delete(conversation_id, user_id)`.

### `models.py` — ORM
`Conversation` (`id`, `user_id`, `title`, `created_at`, `updated_at`) and `Message`
(`id`, `conversation_id` FK cascade, `role`, `content`, `thinking`, `created_at`).
Both tables FK into Supabase's `auth.users` and carry RLS, so the tables themselves
are created in `supabase/migrations/` — **not** by SQLAlchemy `create_all` (same
rule as `profiles`); `models.py` is only the backend's read/write view.

### `schemas/` — API boundary (a package, grouped by purpose)
Import from `modules.chat.schemas` (the `__init__.py`), never the submodules.

- **`chat.py`** — `ChatMessage`, `ChatRequest` *(`POST /chat`)*. `ChatRequest.conversation_id`
  is optional in the type but in practice always sent — see below.
- **`conversation.py`** — `RenameRequest` *(request)*; `ConversationMessage`,
  `ConversationSummary`, `ConversationDetail`, `TitleResponse` *(responses)*.
- **`model.py`** — `ModelInfo`, `ModelsResponse` *(responses for `GET /models`)*.

Naming note: the inbound message is `ChatMessage` (role + content only); its stored
counterpart returned in history is `ConversationMessage` (adds id/thinking/timestamp).

### `dependencies.py` — DI surface
Three providers, matching the three service scopes:
- `get_model_service` — reads the singleton off `app.state`.
- `get_conversation_service` / `get_chat_service` — build their request-scoped
  service from a fresh `AsyncSession`, the current user (`modules.auth`), and the
  shared `LlmClient` off `app.state`.

---

## Conversation id lifecycle — minted by the frontend

The id is **not** server-generated. The frontend mints a `crypto.randomUUID()`
before a new chat even opens (see `frontend/docs/modules/chat.md` — `NewChatRedirect`)
and `POST /chat` always carries that `conversation_id`. `ChatService.stream_and_persist`
resolves it with a simple get-or-create, never a separate "draft" or re-key step:

```python
conversation = None
if request.conversation_id is not None:
    conversation = await self._repo.get(request.conversation_id, self._user_id)
if conversation is None:
    conversation = await self._repo.create(
        self._user_id, self._fallback_title(first_user), conversation_id=request.conversation_id,
    )
```

An unrecognized/foreign id just creates a new row owned by the caller — `get()`
filters by `user_id`, so a client can never read or hijack another user's
conversation by guessing its id; at worst a PK collision would surface as an error,
never a leak. The stream still emits a `meta` event with the id first (kept for
visibility/compatibility), but the frontend no longer needs it for routing since it
already knows the id before the request is sent.

> **RLS caveat (critical).** The backend connects to Postgres via `asyncpg` as a
> privileged role, so `auth.uid()` is **not** populated on backend queries — RLS
> with `auth.uid() = user_id` does **not** filter backend access. The service must
> therefore filter **every** query by the current user's id itself (as above). RLS
> exists only to protect Supabase's auto-exposed REST API (defense-in-depth), exactly
> as for `profiles`.

---

## Titling — LLM-generated, out-of-band, with a fallback

1. **Instant placeholder.** On creation, `title` = first user message trimmed to
   ~40 chars (`ChatService._fallback_title`), so the sidebar entry is never blank.
2. **Out-of-band upgrade.** Once the frontend's stream completes, it calls
   `POST /conversations/{id}/title` separately — **not** part of the `/chat` SSE
   stream — so titling can never delay a reply. `ConversationService.generate_title`
   re-reads the conversation's first user+assistant messages, asks the LLM for a
   ≤6-word title, and persists it.
3. **Failure = keep the fallback.** If the title call errors or yields nothing, the
   existing title (placeholder or previous) is returned unchanged.

## SSE contract for `POST /chat`

```
{"type":"meta","conversation_id":"…"}        — first, confirms the resolved id
{"type":"thinking","chunk":"…"}              — zero or more, only if enable_thinking
{"type":"text","chunk":"…"}                  — zero or more
{"done":true}                                — terminal, success
{"error":"…"}                                — terminal, failure (rolls back the turn)
```

There is no `title` event — titling is a separate request (above), not part of this
stream.

---

## Dependency flow (flow downward only)

```
modules/chat/router.py
    ├─→ modules/auth/dependencies.py (get_current_user)            # public surface
    ├─→ modules/chat/services/model.py (ModelService)
    │       └─→ shared/llm/client.py (LlmClient)
    ├─→ modules/chat/services/conversation.py (ConversationService)
    │       ├─→ modules/chat/repository.py (ConversationRepository)
    │       │       └─→ core/database (AsyncSession)
    │       └─→ shared/llm/client.py (LlmClient: title generation)
    └─→ modules/chat/services/chat.py (ChatService)
            ├─→ modules/chat/repository.py (ConversationRepository)
            └─→ shared/llm/client.py (LlmClient: stream)
                    └─→ HTTP → models service (/v1/chat/completions, /v1/models)
```

`chat` imports from `shared/`, `core/`, and `modules/auth`'s public surface only. It
must never import from `main.py` or reach into another module's internals.

---

## Future

- A `health`/system concern may move out of `chat` into its own small module, since
  engine readiness is not really chat business logic.
- Pagination on `GET /conversations` and on message history once volumes grow.
- Server-side resumable streams (so an in-flight reply survives a refresh/tab-close)
  would need a durable buffer (DB/Redis) keyed by `conversation_id` — today a stream
  is held only in-process per request, matching the frontend's client-side-only
  (`ChatSession`) persistence tier. See `frontend/docs/modules/chat.md`.
