-- Desired shape of public.messages (chat module).
-- One row per message in a conversation, read in created_at order.
-- See supabase/docs/modules/chat.md.

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
