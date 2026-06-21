-- add_manga_pages
-- Generated 2026-06-20T05:20:02+00:00 by scripts/gen_migration.py
-- Seeded from: schema/read/manga_pages.sql
-- Desired shape stays authoritative in schema/read/.

-- Desired shape of public.manga_pages (read module).
-- One row per image, in `position` order within its section. width/height are the
-- intrinsic pixel dimensions so the reader can reserve an aspect-ratio box (no
-- layout shift while the image loads). See supabase/docs/modules/read.md.

create table if not exists public.manga_pages (
  id           uuid        primary key default gen_random_uuid(),
  section_id   uuid        not null references public.manga_sections (id) on delete cascade,
  storage_path text        not null,   -- object path in the `manga` bucket
  position     integer     not null,   -- 0-based order within the section
  width        integer,                -- intrinsic px (nullable until known)
  height       integer,
  created_at   timestamptz not null default now()
);

-- Loading a section: its pages in order. Unique so a (section, position) pair can't dup.
create unique index if not exists manga_pages_section_position_idx
  on public.manga_pages (section_id, position);

-- RLS: a page is visible/editable only through an owned manga (join up via the section).
alter table public.manga_pages enable row level security;

create policy "Pages readable through an owned manga"
  on public.manga_pages for select using (
    exists (
      select 1 from public.manga_sections s
      join public.mangas m on m.id = s.manga_id
      where s.id = manga_pages.section_id and m.user_id = auth.uid()
    )
  );

create policy "Insert pages through an owned manga"
  on public.manga_pages for insert with check (
    exists (
      select 1 from public.manga_sections s
      join public.mangas m on m.id = s.manga_id
      where s.id = manga_pages.section_id and m.user_id = auth.uid()
    )
  );

create policy "Delete pages through an owned manga"
  on public.manga_pages for delete using (
    exists (
      select 1 from public.manga_sections s
      join public.mangas m on m.id = s.manga_id
      where s.id = manga_pages.section_id and m.user_id = auth.uid()
    )
  );
