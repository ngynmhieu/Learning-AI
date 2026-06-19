# Schema: `chat` module — `conversations`, `messages`

> Per-module schema doc — the database half of the conversation-history feature.
> Mirrors how the backend/frontend document each module. Read
> `../supabase_guidelines.md` first for the migration workflow and rules. The
> backend service + repository that read/write these tables are documented in
> `backend/docs/modules/chat.md`; the frontend in `frontend/docs/modules/chat.md`.

## Status

**Proposal.** Not yet applied. Source fragments will live at
`supabase/schema/chat/conversations.sql` and `supabase/schema/chat/messages.sql`;
the generator stamps them into flat migrations `add_conversations` and
`add_messages` (in that order — `messages` FKs into `conversations`).

## Why these are SQL migrations (not SQLAlchemy)

Both tables foreign-key into Supabase's internal `auth.users` (directly or via
`conversations`) and use Row Level Security — neither expressible by SQLAlchemy
`create_all`. So the tables + FKs + RLS live in migrations, and the backend keeps
only an ORM read/write view in `backend/app/modules/chat/models.py`.

## `conversations`

One row per chat thread, owned by a user. The sidebar lists these newest-first.

```sql
create table if not exists public.conversations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null default 'New conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sidebar query: a user's conversations, newest activity first.
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- RLS: a user may only touch their own conversations.
alter table public.conversations enable row level security;

create policy "Conversations are readable by the owner"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Owner can insert conversations"
  on public.conversations for insert with check (auth.uid() = user_id);
create policy "Owner can update their conversations"
  on public.conversations for update using (auth.uid() = user_id);
create policy "Owner can delete their conversations"
  on public.conversations for delete using (auth.uid() = user_id);
```

## `messages`

One row per message in a conversation, in `created_at` order.

```sql
create table if not exists public.messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references public.conversations (id) on delete cascade,
  role             text        not null check (role in ('user', 'assistant')),
  content          text        not null,
  thinking         text,                 -- nullable: extended-thinking trace, when present
  created_at       timestamptz not null default now()
);

-- Loading a conversation: its messages in order. Composite (conversation_id, created_at)
-- so one index serves both the WHERE filter and the ORDER BY in a single seek.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- RLS: a message is visible/editable only if the user owns its conversation.
alter table public.messages enable row level security;

create policy "Messages are readable through an owned conversation"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "Insert messages into an owned conversation"
  on public.messages for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "Delete messages through an owned conversation"
  on public.messages for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
```

> Messages are append-only from the app's side (no update policy) — edits/regens,
> if added later, get their own policy + migration.

## Notes

- **RLS caveat (critical).** The backend connects via `asyncpg` as a privileged
  role, so `auth.uid()` is **not** populated on backend queries — these policies do
  **not** filter backend access. They protect Supabase's auto-exposed REST API only
  (defense-in-depth). Ownership for backend reads/writes is enforced in the
  service/repository (`WHERE user_id = <current user>`). See
  `backend/docs/modules/chat.md`.
- **Cascade deletes.** Deleting a user drops their conversations; deleting a
  conversation drops its messages — both via `on delete cascade`.
