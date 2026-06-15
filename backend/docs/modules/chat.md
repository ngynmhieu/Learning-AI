# Module: `chat`

> Per-module architecture doc. Mirrors how the frontend documents each module.
> Read `../backend_guidelines.md` first for the rules that govern every module.

## Responsibility

The `chat` module owns one business capability: **turning a conversation history into a streamed LLM response**. It receives chat requests over HTTP, calls the standalone **models service** over HTTP, and streams tokens back as Server-Sent Events.

It does **not** own:
- The model loading/inference internals → that is the standalone **models service**; the backend reaches it only through the `shared/llm/` `LlmClient`.
- Configuration → `core/config.py`.
- Authentication / "who is the user" → the future `auth` module's public surface.
- Persistence of conversations → **not yet built** (see *Future*).

---

## Target Structure

```
backend/app/modules/chat/
├── __init__.py
├── router.py          # HTTP endpoints: POST /chat, GET /health
├── service.py         # ChatService — orchestrates conversation → engine
├── schemas.py         # ChatRequest, ChatResponse, Message, StreamChunk
└── dependencies.py    # get_chat_service / wiring (module's DI surface)
```

`models.py` is intentionally **absent for now** — chat has no database tables yet. It will be added when conversation persistence lands.

---

## File-by-File

### `router.py` — HTTP boundary (thin)
Holds the `APIRouter(tags=["chat"])` (no path prefix) and two endpoints:
- `POST /chat` — builds the SSE `StreamingResponse`, delegates streaming to `ChatService`.
- `GET /health` — reports engine readiness via `ChatService.health_check()`.

Stays thin per the API Layer Rules: it only maps the request into a service call and wraps the result in `StreamingResponse`. The message-dict conversion (`[{"role":..., "content":...}]`) currently in the handler should move **into the service** (`_normalize_messages` already exists there) so the router carries no transformation.

### `service.py` — orchestration
`ChatService`, constructed with an injected `LlmClient`. Responsibilities:
- `stream_response(...)` — normalize messages, delegate to the client's `stream(...)` (which calls the models service `/v1/chat/completions`), yield content chunks.
- `health_check()` — surface backend / models-service readiness.

Depends only on the injected client (constructor injection). Imports the client from `shared/llm`, never the other way around.

### `schemas.py` — API boundary
The Pydantic models exactly as they are today: `Message`, `ChatRequest`, `ChatResponse`, `StreamChunk`. These describe what crosses HTTP — not storage.

### `dependencies.py` — DI surface
Holds the provider that hands a ready `ChatService` to the router via `Depends`. This replaces the current module-global `_chat_service` + `set_chat_service` pattern in `agent.py`.

---

## Dependencies (flow downward only)

```
modules/chat/router.py
    └─→ modules/chat/service.py        (ChatService)
            └─→ shared/llm/client.py        (LlmClient)
                    └─→ HTTP → models service   (/v1/chat/completions)

modules/chat/router.py / service.py
    └─→ modules/chat/schemas.py
    └─→ core/config.py                 (models service URL, model id)
```

`chat` imports from `shared/` and `core/`. It must never import from `main.py` or reach into another module's internals.

---

## Migration Plan (replace the in-process engine with the models service)

The model now runs in the standalone **models service**; the backend calls it
over HTTP. Ordered so the app stays runnable at each step.

1. **Add the client dependency.** Add `openai` to `requirements.txt` — an
   OpenAI-compatible client; the models service speaks that format.

2. **Replace the engine with a client.** Rewrite `shared/llm/` so the
   `QwenService` engine (loads/owns the model) becomes `LlmClient` — a thin
   wrapper over the `openai` SDK pointed at `settings.models_service_url`. It
   exposes `generate(...)` and `stream(...)` that call `/v1/chat/completions`.
   No `torch` / `transformers` / `bitsandbytes` imports remain.

3. **Update config.** In `core/config.py`, drop the model *loading* settings
   (`quantize`, model weights/name as a load target); add `models_service_url`
   and `model_name` as the **model id to request** (e.g. `qwen3.5-9b`).

4. **Update the service.** `ChatService` now depends on `LlmClient`; its
   `stream_response` relays the client's streamed content. Router and schemas
   are unchanged.

5. **Slim `main.py`.** Remove the model-loading lifespan step
   (`await qwen_service.load(...)`). Construct `LlmClient` (cheap) and wire
   `ChatService`. The backend now boots in seconds.

6. **Drop the heavy deps.** Remove `torch`, `torchvision`, `transformers`,
   `accelerate`, and `bitsandbytes` from the backend `requirements.txt` — the
   backend no longer runs models.

7. **Smoke test end-to-end.** Start the models service (`run_models.bat`), then
   the backend; hit `GET /health` and `POST /chat`, confirm streaming works.

---

## Planned: `GET /models` (proposal, not yet built)

> **Status: proposal.** The frontend needs to know **how many models the LLM
> manager has** (to show the count and, later, a model picker). The models being
> listed are exactly the chat model, and `chat` is the only consumer — so this
> lives **in the chat module**, not a separate one. (A dedicated `system` module
> was considered and rejected as premature: one proxy endpoint, one consumer.
> If health/readiness/model-switch endpoints accumulate later, extract `system`
> then.)

### The endpoint

`GET /models` → the catalog the models service reports, plus a count.

```json
{
  "count": 1,
  "models": [
    { "id": "qwen3.5-9b", "description": "Qwen3.5 9B · …", "loaded": true }
  ]
}
```

### Changes (all within `chat` + the shared client)

**`shared/llm/client.py`** — add one business-agnostic method. The catalog comes
from the models service's `GET /v1/models`, already reachable via the SDK
(`health()` uses `self._client.models.list()` today). Custom fields arrive as SDK
extras (`model_extra`):

```python
def list_models(self) -> list[dict]:
    resp = self._client.models.list()
    return [
        {
            "id": m.id,
            "description": (m.model_extra or {}).get("description", ""),
            "loaded": (m.model_extra or {}).get("loaded", False),
        }
        for m in resp.data
    ]
```

**`modules/chat/service.py`** — `ChatService` already holds the injected
`LlmClient`; add a thin method:

```python
def list_models(self) -> dict:
    models = self._llm.list_models()
    return {"count": len(models), "models": models}
```

**`modules/chat/schemas.py`** — add `ModelInfo` (`id`, `description`, `loaded`)
and `ModelsResponse` (`count`, `models`).

**`modules/chat/router.py`** — one thin endpoint (the router has no path prefix,
alongside `/chat` and `/health`):

```python
@router.get("/models", response_model=ModelsResponse)
async def list_models(chat_service: ChatService = Depends(get_chat_service)):
    return chat_service.list_models()
```

No `main.py` change — `ChatService` and its `LlmClient` are already wired.

### Dependency flow (unchanged shape)

```
modules/chat/router.py (GET /models)
    └─→ modules/chat/service.py (ChatService.list_models)
            └─→ shared/llm/client.py (LlmClient.list_models)
                    └─→ HTTP → models service (/v1/models)
```

---

## Future (when persistence + auth arrive)

- `models.py` — `conversations` and `messages` tables (see the auth & persistence plan).
- `service.py` gains: save user message → stream → save assistant reply.
- Endpoints gain `user = Depends(get_current_user)` from `modules/auth/dependencies.py`.
- A `health`/system concern may move out of `chat` into its own small module, since engine readiness is not really chat business logic.
