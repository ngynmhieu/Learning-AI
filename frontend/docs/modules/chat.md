# Chat Module — Architecture & Build Plan

## Overview

The chat module is the core feature of The Nocturnal Athenaeum. It provides a conversational interface between the user and the Qwen language model served by the backend.

This document covers the planned component structure, build order, and design decisions specific to this module.

---

## Current Structure

```
frontend/src/
  shared/
    ui/
      MarkdownRenderer.tsx            ← parses markdown string into styled React elements
      heroicons-animated/             ← animated icon components
  modules/
    chat/
      index.ts                        ← public API
      pages/
        index.ts
        ChatPage.tsx                  ← assembles the full chat screen
      widgets/
        index.ts
        ChatTranscript/
          index.ts                    ← public API for this widget
          ChatTranscript.tsx          ← scrollable conversation area
          components/
            ChatMessage.tsx           ← single message bubble (user or assistant)
        ChatInput.tsx                 ← message composer at the bottom
        ChatGreeting.tsx              ← greeting / empty state
      features/
        index.ts
        send-message/
          index.ts
          useSendMessage.ts           ← handles API call, streaming, state
      entities/
        index.ts
        message/
          index.ts
          message.types.ts           ← Message, Role, MessageStatus types
          message.helpers.ts         ← formatters, id generators
      shared/
        index.ts                     ← public API for chat-internal shared code
        useStreamBuffer.ts           ← smooths uneven SSE chunks into steady character output
```

## Planned Additions

```
widgets/
  ChatTranscript/
    components/
      TypingIndicator.tsx            ← animated dots while assistant generates
      FollowUpChips.tsx              ← suggestion prompt chips (optional)
```

---

## Component Responsibilities

### `ChatPage` _(pages)_
- Assembles the full screen layout
- Passes no business logic — only wires widgets together
- Layout: transcript + input stacked vertically

### `ChatTranscript` _(widget)_
- Scrollable container that holds all messages
- Auto-scrolls to bottom on new message
- Shows `ChatWindow` (empty state) when no messages
- Shows `TypingIndicator` while assistant is generating
- Shows `ScrollToBottom` button when user scrolls up
- Renders a list of `ChatMessage` for each message

### `MarkdownRenderer` _(shared/ui)_
- Converts a markdown string into styled React elements
- Packages: `react-markdown` + `remark-gfm` (GFM extensions: tables, strikethrough, task lists)
- Styled components: `p`, `h1–h3`, inline `code`, block `pre > code`, `ul`/`ol`, `blockquote`, `a`, `strong`, `em`
- All colors reference `--owl-*` CSS variables
- Used only for assistant messages — user messages render as plain text

### `ChatMessage` _(widget sub-component)_
- Renders a single message bubble
- **User messages**: right-aligned, brown background, plain `whitespace-pre-wrap` text
- **Assistant messages**: left-aligned, cream/glass background, content rendered via `MarkdownRenderer`
- **Streaming**: uses `useStreamBuffer` to smooth uneven chunk sizes into a steady typewriter output
- Supports states: `complete`, `streaming`, `error`

### `TypingIndicator` _(widget sub-component)_
- Three animated dots
- Shown while assistant response is streaming or loading

### `ChatInput` _(widget — done)_
- Multiline textarea with auto-grow
- Send button (arrow up icon)
- Stop button replaces send while assistant is generating
- Disabled while assistant is responding

### `ChatWindow` _(widget — done)_
- Greeting screen shown when transcript is empty
- Owl mascot + app name + tagline

### `useSendMessage` _(feature)_
- Calls `POST /api/v1/chat` on the backend (single endpoint, always streams)
- Reads the SSE stream and appends chunks to the message
- Manages state: `idle`, `loading`, `streaming`, `error`
- On success: appends assistant message to transcript
- On error: shows error state on the last message

### `useStreamBuffer` _(chat/shared)_
- Accepts the raw `target` string (full content so far) and returns a `displayed` string
- Releases characters at a fixed rate via `requestAnimationFrame` regardless of chunk size
- When `target` resets or shortens (new message), syncs `displayed` immediately
- Tune `CHARS_PER_FRAME` to control speed of the typewriter effect

### `message.types.ts` _(entity)_
```ts
type Role = "user" | "assistant";
type MessageStatus = "complete" | "streaming" | "error";

interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  createdAt: number;
}
```

---

## Build Order

| Step | Component | Depends on |
|------|-----------|------------|
| 1 | `message.types.ts` | nothing |
| 2 | `message.helpers.ts` | types |
| 3 | `MarkdownRenderer` | react-markdown, remark-gfm |
| 4 | `ChatMessage` | types, MarkdownRenderer |
| 5 | `TypingIndicator` | nothing |
| 6 | `ChatTranscript` | ChatMessage, TypingIndicator |
| 7 | `useSendMessage` | types, backend API |
| 8 | `ChatPage` | all widgets + feature |

---

## State Flow

```
User types → ChatInput
  → useSendMessage called
    → append user Message to transcript (status: complete)
    → append empty assistant Message (status: streaming)
    → call POST /api/v1/chat/stream
    → stream SSE chunks → update assistant message content
    → on stream end → set assistant message status: complete
    → on error → set assistant message status: error
```

State lives in `ChatPage` and is passed down — no global store needed at this stage.

---

## Design Notes

- Message bubbles use proportional units only (rem, %, vw) per guidelines
- All colors reference `--owl-*` CSS variables — no hardcoded hex
- Streaming text should append smoothly without layout jumps
- Transcript padding should leave breathing room above the input bar
- Mobile: input bar stays pinned to bottom using `sticky` or `fixed`

---

## Planned: extended-thinking toggle + model count (proposal)

> **Status: proposal.** Documents the plan before implementation. Two user-facing
> additions; only one of them touches the backend.

### 1. Extended-thinking on/off — a UI toggle (no new API)

`enable_thinking` already exists end-to-end: it is a field on `ChatRequest`
(`shared/api/chatApi.ts`) sent to `POST /chat`. Today `useSendMessage` hardcodes
it to `true`. The toggle just makes that boolean user-controlled — **no backend
change, no new endpoint** (stateless, per-request, like Claude/ChatGPT reasoning
toggles).

**Wiring (state lives in `ChatPage`, passed down — matches the existing pattern):**

```
ChatPage
  ├── thinkingEnabled: boolean  (useState, default false)
  ├── <ChatInput ... thinkingEnabled onToggleThinking={setThinkingEnabled} />
  └── useSendMessage({ ..., thinkingEnabled })
        └── sendMessage() → chatApi.stream({ ..., enable_thinking: thinkingEnabled })
```

**Files:**
| File | Change |
|---|---|
| `pages/ChatPage.tsx` | add `thinkingEnabled` state; pass to input + send hook |
| `widgets/ChatInput.tsx` | render a switch (label e.g. "Extended thinking"); call `onToggleThinking` |
| `features/send-message/useSendMessage.ts` | replace hardcoded `enable_thinking: true` with the passed-in value |
| `shared/ui/` | add a `Switch` primitive (shadcn `switch`) if none exists, exported via `shared/ui/index.ts` |

`shared/api/chatApi.ts` is **unchanged** — `enable_thinking?` is already in
`ChatRequest`.

The toggle belongs in the send-message flow, so a lightweight local-state +
prop approach is preferred over a dedicated `features/toggle-thinking/` slice
(a single boolean does not earn its own feature folder).

### 2. Model count — `GET /models`

Calls the planned backend `GET /models` (see the *Planned: `GET /models`* section
in `backend/docs/modules/chat.md`) and surfaces the count in the chat UI (e.g. a
small badge near the greeting or header: "*N models available*").

**Placement of the caller:** add `listModels()` to the **existing
`shared/api/chatApi.ts`** — one file per backend domain. `/models` is served by
the chat module and chat is its only consumer, so it belongs with the other chat
callers, not a separate `systemApi.ts`. Uses `fetchWithToken` like `stream()`.

```ts
// add to shared/api/chatApi.ts
export interface ModelInfo { id: string; description: string; loaded: boolean; }
export interface ModelsResponse { count: number; models: ModelInfo[]; }

export const chatApi = {
  // ...existing stream()...
  async listModels(): Promise<ModelsResponse> {
    const res = await fetchWithToken("/models");
    if (!res.ok) throw new Error("Failed to load models");
    return res.json();
  },
};
```

**Consumption:** a small `useModels()` hook in `modules/chat/shared/` (or inline
`useEffect` in `ChatPage`) fetches once on mount and exposes `count`. A presentational
badge in `ChatGreeting` (or the header) shows it.

**Files:**
| File | Change |
|---|---|
| `shared/api/chatApi.ts` | add `listModels()` + `ModelInfo`/`ModelsResponse` types |
| `modules/chat/shared/useModels.ts` | new — fetch + expose `count`, `models` |
| `widgets/ChatGreeting.tsx` (or header) | render the count badge |

### Build order

| Step | Change | Depends on |
|---|---|---|
| 1 | Backend `system` module + `GET /models` | — |
| 2 | `shared/ui` `Switch` primitive | — |
| 3 | `useSendMessage` reads `thinkingEnabled` | — |
| 4 | `ChatInput` switch + `ChatPage` state | 2, 3 |
| 5 | `shared/api/systemApi.ts` | 1 |
| 6 | `useModels` + count badge | 5 |
