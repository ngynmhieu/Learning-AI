-- alter_library_assets_storage_path
-- Generated 2026-07-12T16:26:36+00:00 by scripts/gen_migration.py
-- No matching schema/read/ fragment — scaffold only.
-- Write the change below, and update schema/read/ to match.

-- Loosen storage_path so a streaming collect can reserve a row (fixed
-- position, real id) before that item's download/upload has actually
-- finished — filled in afterward via an UPDATE. No backfill needed: this
-- only loosens a constraint, it doesn't change any existing row's data.
alter table public.library_assets alter column storage_path drop not null;
