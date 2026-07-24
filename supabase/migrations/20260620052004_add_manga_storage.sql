-- add_manga_storage
-- Generated 2026-06-20T05:20:02+00:00 by scripts/gen_migration.py
-- Seeded from: schema/read/storage_manga.sql
-- Desired shape stays authoritative in schema/read/.

-- Desired shape of the `manga` storage bucket (read module).
-- Private bucket holding every page image and cover. Object paths are prefixed
-- by owner so one RLS rule on storage.objects enforces ownership:
--   manga/{user_id}/{manga_id}/{section_id}/{position}-{uuid}.{ext}
-- See supabase/docs/modules/read.md and supabase_guidelines.md -> Storage Buckets.

-- Private bucket (public = false -> no open URLs; reads go through signed URLs).
insert into storage.buckets (id, name, public)
values ('manga', 'manga', false)
on conflict (id) do nothing;

-- A user may only touch files under their own {user_id}/ prefix.
-- storage.foldername(name) returns text[]; auth.uid() is uuid -> cast to text.
create policy "Read own manga files"
  on storage.objects for select
  using (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Upload own manga files"
  on storage.objects for insert
  with check (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Delete own manga files"
  on storage.objects for delete
  using (bucket_id = 'manga' and (storage.foldername(name))[1] = auth.uid()::text);
