-- Desired shape of public.mangas (read module, displayed as "Lector").
-- One row per manga series, owned by a user; the library grid lists these newest-first.
-- See supabase/docs/modules/read.md.

create table if not exists public.mangas (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  description text,
  cover_path  text,                 -- object path of the cover in the `manga` bucket (nullable)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Library query: a user's series, newest activity first.
create index if not exists mangas_user_updated_idx
  on public.mangas (user_id, updated_at desc);

-- RLS: a user may only touch their own mangas.
alter table public.mangas enable row level security;

create policy "Mangas are readable by the owner"
  on public.mangas for select using (auth.uid() = user_id);

create policy "Owner can insert mangas"
  on public.mangas for insert with check (auth.uid() = user_id);

create policy "Owner can update their mangas"
  on public.mangas for update using (auth.uid() = user_id);

create policy "Owner can delete their mangas"
  on public.mangas for delete using (auth.uid() = user_id);
