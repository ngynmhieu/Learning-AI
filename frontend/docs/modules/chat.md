# Chat Module — Architecture

## Overview

The chat module is the core feature of The Nocturnal Athenaeum. It provides a
conversational interface between the user and the LLM served by the standalone
**models service** (reached through the backend's `/chat` endpoint), with
conversations persisted and browsable from a sidebar.

This document covers the actual component structure and the design decisions
behind it — in particular, how each conversation's live state is isolated and
survives navigation, and how conversation ids are minted.

---

## Structure

```
frontend/src/
  app/
    router/
      index.tsx                       ← route tree + provider wiring
      NewChatRedirect.tsx              ← "/" → mints an id, redirects to /c/:id
  shared/
    api/
      chatApi.ts                       ← all chat + conversation HTTP/SSE calls
    ui/
      MarkdownRenderer.tsx
      heroicons-animated/
  modules/
    chat/
      index.ts                         ← public API
      pages/
        ChatPage.tsx                   ← assembles the screen for one conversation
      widgets/
        ChatTranscript/
          ChatTranscript.tsx
          components/ChatMessage.tsx
        ChatInput.tsx
        ChatGreeting.tsx
        ConversationList/
          ConversationList.tsx         ← sidebar history list + "New chat"
          components/ConversationItem.tsx ← row: open / inline rename / delete
      features/
        send-message/
          useSendMessage.ts            ← send/stop workflow for one conversation
      entities/
        conversation/                  ← the sidebar list (schema + model)
          conversation.types.ts
          model/
            conversationsContext.ts
            ConversationsProvider.tsx
            useConversations.ts
        session/                       ← the live per-conversation runtime (schema + model)
          session.types.ts
          model/
            chatSession.ts             ← ChatSession — one conversation's runtime
            chatSessionRegistry.ts     ← ChatSessionRegistry — Map<id, ChatSession>
            chatRegistryContext.ts
            useChatRegistry.ts
            useChatSession.ts          ← binds a view to one session
            ChatSessionsProvider.tsx
        message/
          message.types.ts             ← Message, Role, MessageStatus
          message.helpers.ts           ← createMessage / updateLastMessage / appendToLastMessage
      shared/
        useStreamBuffer.ts             ← smooths uneven SSE chunks into steady output
        useModels.ts                   ← fetches the model catalog once
```

---

## Routing — client-generated conversation ids

The conversation id is minted on the **frontend**, before the conversation exists
anywhere else. `app/router/NewChatRedirect.tsx` is the landing element for `/`:

```tsx
export function NewChatRedirect() {
  const navigate = useNavigate();
  const [id] = useState(() => crypto.randomUUID());
  useLayoutEffect(() => {
    navigate(`/c/${id}`, { replace: true, state: { isNew: true } });
  }, [id, navigate]);
  return null;
}
```

`useLayoutEffect` redirects before paint, so the user never sees `/`. Every chat —
new or reopened — therefore renders under the **single** `/c/:conversationId` route:

```tsx
{ path: "/", element: <NewChatRedirect /> },
{ path: "/c/:conversationId", element: <Suspense ...><ChatPage /></Suspense> },
```

Because sending the first message no longer crosses a route boundary (it used to be
`/` → `/c/:id` once the backend returned an id), `ChatPage` is never remounted —
which is also what fixed an earlier visual flash on the first prompt. The `isNew:
true` router state tells `ChatPage` this id has nothing persisted yet, so it skips
the history fetch.

Both `ConversationsProvider` and `ChatSessionsProvider` wrap `AppLayout` (inside
`ProtectedRoute`), so they're created once per signed-in session and shared by the
sidebar and every `ChatPage` instance.

---

## `entities/session` — the live runtime

The unit of isolation. Each conversation's messages, status, and in-flight stream
live in a plain-TS class **outside the React tree**, so navigating away from a
conversation can never abort its stream, and one conversation's state can never leak
into another's.

### `ChatSession` (`chatSession.ts`)
Constructed with a `conversationId`. Holds `state: SessionState` (`{ conversationId,
messages, status }`), notifies subscribers on every mutation (immutable replace), and
exposes:
- `subscribe` / `getSnapshot` — the `useSyncExternalStore` contract.
- `markHistoryLoaded()` — for a freshly minted chat with nothing to fetch yet.
- `ensureHistory()` — fetches `GET /conversations/{id}` once; no-ops if already
  loaded/marked or if a turn is currently streaming (never clobbers a live reply).
- `runTurn(args, hooks)` — appends the user message + a streaming assistant
  placeholder, calls `hooks.onTurnStart`, streams `POST /chat` (always with
  `conversation_id`), appends chunks, then calls `hooks.onComplete`. Hooks let the
  session stay pure (no sidebar/router knowledge) while still reporting the
  cross-cutting moments the app cares about.
- `stop()` — aborts the in-flight stream via `AbortController`.

### `ChatSessionRegistry` (`chatSessionRegistry.ts`)
`Map<conversationId, ChatSession>` with `get` / `getOrCreate`. Because instances
live here — not in any component — their streams survive unmount/remount and
navigation between conversations.

### `ChatSessionsProvider` / `useChatRegistry`
`useState(() => new ChatSessionRegistry())` mounted once inside `ProtectedRoute`;
provides the one registry for the signed-in session via context. Holds no chat
logic itself.

### `useChatSession(routeId, isNew)`
Binds a view to **one** session: `registry.getOrCreate(routeId)`, then
`useSyncExternalStore(session.subscribe, session.getSnapshot)`. An effect calls
`markHistoryLoaded()` for a new chat or `ensureHistory()` otherwise. Switching
`routeId` just swaps which session the component watches — every other session
keeps running untouched.

---

## `entities/conversation` — the sidebar list

Deliberately a **separate** store from the session runtime, using plain React
`useState` instead of an external store:

- `Conversation` (schema): `{ id, title, updatedAt }`.
- `ConversationsProvider` — fetches `GET /conversations` once per auth session;
  exposes `conversations`, `loading`, `error`, and mutations `upsert`, `bump`,
  `applyTitle`, `rename` (→ `PATCH`), `remove` (→ `DELETE`).
- `useConversations()` — the read hook.

**Why two stores, not one:** the sidebar list updates rarely (one row per
conversation, on creation/rename/bump); the session updates on every streamed
token. Merging them would re-render the entire sidebar list on every token of every
open chat ("token storm"). Keeping them separate means the sidebar only re-renders
when `upsert`/`bump`/`applyTitle` actually fire — at most twice per turn.

---

## `entities/message`

`Message` / `Role` / `MessageStatus` types, plus `createMessage`,
`updateLastMessage`, `appendToLastMessage` — pure helpers `ChatSession.runTurn` uses
to build the immutable message arrays.

---

## `features/send-message`

`useSendMessage(routeId)` is the glue between one session and the sidebar list — the
only thing that needs to see both:

```ts
const session = registry.getOrCreate(routeId);
void session.runTurn(args, {
  onTurnStart: (id, isFirst) => { if (isFirst) upsert({ id, title: "New conversation", updatedAt: Date.now() }); else bump(id); },
  onComplete:  (id, isFirst) => { if (isFirst) chatApi.generateTitle(id).then(({ title }) => applyTitle(id, title)).catch(() => {}); },
});
```

No navigation happens here — the id is already in the URL, minted before the chat
opened. `stop()` just forwards to `registry.get(routeId)?.stop()`.

---

## `pages/ChatPage`

Reads `:conversationId` (always present — `/` redirects in before this page ever
renders) and the `isNew` router state. Calls `useChatSession(routeId, isNew)` for
`{ messages, status }` and `useSendMessage(routeId)` for `{ send, stop }`. Renders
either the centered greeting + input (empty state) or the transcript + bottom input
(active state), animated between with `motion`/`AnimatePresence` using a shared
`layoutId` on the input so it slides rather than jumps.

---

## `widgets`

- **`ChatTranscript` / `ChatMessage`** — render the message list; assistant messages
  use `useStreamBuffer` to smooth uneven SSE chunk sizes into a steady typewriter
  rate, and `MarkdownRenderer` for formatting.
- **`ChatInput`** — composer (auto-grow textarea, send/stop button, model picker,
  extended-thinking toggle).
- **`ChatGreeting`** — empty state, shows the model count from `useModels`.
- **`ConversationList`** — sidebar list: "New chat" (→ `/`, which redirects to a
  fresh id), a history section, loading/empty/error states.
- **`ConversationItem`** — one row: click to open (`/c/:id`), hover reveals inline
  rename (text input, Enter/Escape/blur to save) and delete (navigates to `/` if the
  deleted conversation was the active one).

---

## `shared/api/chatApi.ts`

All HTTP/SSE calls for this domain, via `fetchWithToken`:

```ts
stream(body: ChatRequest, signal?): AsyncGenerator<StreamChunk>   // POST /chat, parses SSE lines
listModels(): Promise<ModelsResponse>                             // GET /models
listConversations(): Promise<ConversationSummaryDto[]>            // GET /conversations
getConversation(id): Promise<ConversationDetailDto>                // GET /conversations/{id}
generateTitle(id): Promise<GeneratedTitleDto>                       // POST /conversations/{id}/title
renameConversation(id, title): Promise<void>                       // PATCH /conversations/{id}
deleteConversation(id): Promise<void>                               // DELETE /conversations/{id}
```

`ChatRequest.conversation_id` is sent on **every** call to `stream()` — `ChatSession`
always knows its id (minted client-side), so there is no "omit for a new chat"
branch. `StreamChunk` still carries an optional `meta`/`conversation_id` field for
the backend's first SSE event, but nothing on the frontend reads it for routing
anymore (the route is already correct).

---

## State flow — one turn

```
ChatInput.onSend
  → useSendMessage.send(args)
      → registry.getOrCreate(routeId) → session.runTurn(args, hooks)
          → append user message + streaming assistant placeholder
          → hooks.onTurnStart(id, isFirst)   — upsert (new) or bump (existing) the sidebar row
          → POST /chat (conversation_id always set) → stream chunks → append to assistant message
          → on success: hooks.onComplete(id, isFirst) — generateTitle() + applyTitle() if first
          → on error/abort: mark the assistant message "error" or leave it "complete" (aborted)
```

## History load — one conversation

```
useChatSession(routeId, isNew)
  → registry.getOrCreate(routeId)
  → isNew?  → session.markHistoryLoaded()        — nothing persisted yet, show the greeting
  → else    → session.ensureHistory()             — GET /conversations/{id}, seeds messages
               (no-op if already loaded, or if a turn is currently streaming)
```

---

## Design notes

- Message bubbles use proportional units only (rem, %, vw) per guidelines.
- All colors reference `--owl-*` CSS variables — no hardcoded hex.
- Streaming text appends smoothly via `useStreamBuffer`, without layout jumps.
- Mobile: input bar stays pinned to bottom.

---

## Known characteristics

- **Hard-refreshing an unsent new chat** loses the `isNew` router state, so
  `ensureHistory()` runs and does one `GET /conversations/{id}` → 404 → falls back
  to the empty greeting. Harmless, but means a truly never-sent chat id is never
  persisted — which is correct (nothing should exist for it).
- **Background streaming is client-side only (Tier 1).** Switching conversations
  only changes which `ChatSession` a view subscribes to — every other session keeps
  streaming via its own `AbortController`, unaffected by navigation. This does *not*
  survive a refresh or tab close; that would require a server-side resumable stream
  (a durable buffer keyed by `conversation_id`, e.g. DB/Redis) — see the *Future*
  note in `backend/docs/modules/chat.md`.
- **Ownership is enforced server-side.** A client could in principle send a foreign
  `conversation_id`; the backend's `get(id, user_id)` filters by owner, so this
  fails safe (at worst a PK collision error) rather than leaking another user's data.
