-- add_conversations
-- Generated 2026-06-16T15:44:27+00:00 by scripts/gen_migration.py
-- Seeded from: schema/chat/conversations.sql
-- Desired shape stays authoritative in schema/chat/.

-- Desired shape of public.conversations (chat module).
-- One row per chat thread, owned by a user; the sidebar lists these newest-first.
-- See supabase/docs/modules/chat.md.

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
