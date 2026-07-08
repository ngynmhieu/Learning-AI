-- add_library_assets
-- Generated 2026-07-08T15:15:12+00:00 by scripts/gen_migration.py
-- Seeded from: schema/read/library_assets.sql
-- Desired shape stays authoritative in schema/read/.

-- Desired shape of public.library_assets (read module, displayed as "Lector").
-- One row per unassigned image in a user's staging pool (scraped or uploaded,
-- not yet organized into a manga). Owner-keyed directly on user_id since there is
-- no parent manga to derive ownership through. See supabase/docs/modules/read.md.

create table if not exists public.library_assets (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  storage_path text        not null,   -- object path in the `manga` bucket, under {user_id}/_pool/
  source_url   text,                   -- where it was scraped from; NULL for direct uploads
  width        integer,                -- intrinsic px (nullable until known)
  height       integer,
  created_at   timestamptz not null default now()
);

-- Pool view: a user's unassigned images, newest first.
create index if not exists library_assets_user_created_idx
  on public.library_assets (user_id, created_at desc);

-- RLS: owner-keyed directly on user_id (no manga to join through).
alter table public.library_assets enable row level security;

create policy "Library assets are readable by the owner"
  on public.library_assets for select using (auth.uid() = user_id);

create policy "Owner can insert library assets"
  on public.library_assets for insert with check (auth.uid() = user_id);

create policy "Owner can delete their library assets"
  on public.library_assets for delete using (auth.uid() = user_id);
