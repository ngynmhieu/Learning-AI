# Schema: `read` module — `mangas`, `manga_sections`, `manga_pages` + `manga` storage bucket

> Per-module schema doc — the database half of the manga-reader feature (the
> `read` module; **"Lector"** is the user-facing display name only). Mirrors how the
> chat module documents its schema. Read `../supabase_guidelines.md` first for the
> migration workflow, and its *Storage Buckets* section for how buckets are managed.
> The backend service/repository that read/write these tables are documented in
> `backend/docs/modules/read.md`; the frontend in `frontend/docs/modules/read.md`.

## Status

**Migrations generated, not yet pushed.** Source fragments live at
`supabase/schema/read/{mangas,manga_sections,manga_pages,storage_manga}.sql`.
The generator has stamped them into flat migrations, in order:
`add_mangas` → `add_manga_sections` → `add_manga_pages` → `add_manga_storage`
(each FKs into the previous; storage last). Next step: `supabase db push`.

## Why these are SQL migrations (not SQLAlchemy)

Every table foreign-keys into Supabase's internal `auth.users` (directly or via a
parent) and uses Row Level Security; the storage bucket and its policies live in
Supabase's internal `storage` schema. None of this is expressible by SQLAlchemy
`create_all`. So tables + FKs + RLS + the bucket live in migrations, and the backend
keeps only an ORM read/write view in `backend/app/modules/read/models.py`.

## Data shape

```
mangas            one manga series, owned by a user
  └─ manga_sections   a volume OR a chapter (kind discriminator)
       └─ manga_pages     one image per section, ordered by `position`
```

A manga is organized by **either** volumes **or** chapters — the frontend's two tabs
are just `manga_sections` filtered by `kind`. (Not nested: a section is a volume or a
chapter, never a volume *containing* chapters. If true hierarchy is wanted later, add
a nullable `parent_id` to `manga_sections` in a new migration.)

## `mangas`

One row per series. The library grid lists these newest-first.

```sql
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

alter table public.mangas enable row level security;

create policy "Mangas are readable by the owner"
  on public.mangas for select using (auth.uid() = user_id);
create policy "Owner can insert mangas"
  on public.mangas for insert with check (auth.uid() = user_id);
create policy "Owner can update their mangas"
  on public.mangas for update using (auth.uid() = user_id);
create policy "Owner can delete their mangas"
  on public.mangas for delete using (auth.uid() = user_id);
```

## `manga_sections`

One row per volume or chapter. The **Volumes** tab is `where kind='volume'`, the
**Chapters** tab is `where kind='chapter'`.

```sql
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
```

## `manga_pages`

One row per image, in `position` order within its section. `width`/`height` are the
intrinsic pixel dimensions so the reader can reserve an aspect-ratio box (no layout
shift while the image loads).

```sql
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
```

> Reorder = rewrite `position` for the affected rows (the backend does this in one
> transaction). No update policy on pages beyond that is needed yet.

## `manga` storage bucket

A **private** bucket holds every page image and cover. Object paths are prefixed by
owner so one RLS rule on `storage.objects` enforces ownership:

```
manga/{user_id}/{manga_id}/{section_id}/{position}-{uuid}.{ext}
        ▲ first path segment = owner
```

```sql
-- Private bucket (public = false → no open URLs; reads go through signed URLs).
insert into storage.buckets (id, name, public)
values ('manga', 'manga', false)
on conflict (id) do nothing;

-- A user may only touch files under their own {user_id}/ prefix.
-- storage.foldername(name) returns text[]; auth.uid() is uuid → cast to text.
create policy "Read own manga files"
  on storage.objects for select
  using (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Upload own manga files"
  on storage.objects for insert
  with check (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Delete own manga files"
  on storage.objects for delete
  using (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);
```

## Notes

- **Two RLS roles, and one of them is load-bearing.**
  - *Table* RLS (`mangas`/`manga_sections`/`manga_pages`) is **defense-in-depth only**,
    exactly as for chat: the backend connects via `asyncpg` as a privileged role where
    `auth.uid()` is not populated, so these policies don't filter backend queries —
    ownership for backend reads/writes is enforced in the service/repository
    (`WHERE user_id = <current user>`).
  - *Storage* RLS (`storage.objects`) is **actively enforced**, because the **frontend
    accesses Storage directly** with the user's session token (upload local files,
    fetch signed URLs) — it never goes through the backend for bytes. That policy is
    the real ownership gate on the files, not just defense-in-depth.
- **Service-role bypass.** The backend's scrape-import uploads use the Supabase
  **service-role key**, which bypasses Storage RLS (trusted server), writing under the
  user's `{user_id}/` prefix on their behalf. That key is server-only — never shipped
  to the frontend.
- **Cascade deletes.** Deleting a user drops their mangas → sections → pages (table
  rows) via `on delete cascade`. **Storage objects are NOT cascaded** by the DB — the
  backend deletes the files from the bucket when a manga/section/page row is removed.
- **Reading order** is `manga_pages.position`; section order within a tab is
  `manga_sections.number`.
