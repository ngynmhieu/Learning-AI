-- add_manga_sections
-- Generated 2026-06-20T05:20:02+00:00 by scripts/gen_migration.py
-- Seeded from: schema/read/manga_sections.sql
-- Desired shape stays authoritative in schema/read/.

-- Desired shape of public.manga_sections (read module).
-- One row per volume or chapter (kind discriminator); the Volumes/Chapters tabs
-- are just this table filtered by kind. See supabase/docs/modules/read.md.

create table if not exists public.manga_sections (
  id         uuid        primary key default gen_random_uuid(),
  manga_id   uuid        not null references public.mangas (id) on delete cascade,
  kind       text        not null check (kind in ('volume', 'chapter')),
  number     numeric,              -- reading-order key within a kind (1, 1.5, 2 …); nullable for one-offs
  title      text,                 -- optional label ("Vol. 1: The Beginning")
  cover_path text,                 -- optional section cover in the `manga` bucket
  created_at timestamptz not null default now()
);

-- Tab query: a manga's sections of one kind, in reading order.
create index if not exists manga_sections_manga_kind_number_idx
  on public.manga_sections (manga_id, kind, number);

-- RLS: a section is visible/editable only through an owned manga.
alter table public.manga_sections enable row level security;

create policy "Sections readable through an owned manga"
  on public.manga_sections for select using (
    exists (select 1 from public.mangas m
            where m.id = manga_sections.manga_id and m.user_id = auth.uid())
  );

create policy "Insert sections into an owned manga"
  on public.manga_sections for insert with check (
    exists (select 1 from public.mangas m
            where m.id = manga_sections.manga_id and m.user_id = auth.uid())
  );

create policy "Update sections through an owned manga"
  on public.manga_sections for update using (
    exists (select 1 from public.mangas m
            where m.id = manga_sections.manga_id and m.user_id = auth.uid())
  );

create policy "Delete sections through an owned manga"
  on public.manga_sections for delete using (
    exists (select 1 from public.mangas m
            where m.id = manga_sections.manga_id and m.user_id = auth.uid())
  );
