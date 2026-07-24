-- add_library_assets_position
-- Generated 2026-07-12T15:14:21+00:00 by scripts/gen_migration.py
-- No matching schema/read/ fragment — scaffold only.
-- Write the change below, and update schema/read/ to match.

-- Order library_assets by collect order, not created_at — a batch's images can
-- finish downloading/uploading out of order, so created_at doesn't reflect the
-- order the user actually intended. `position` is assigned by the backend from
-- each batch's original request order (see backend/app/modules/read/services).

alter table public.library_assets
  add column if not exists position integer not null default 0;

-- Backfill existing rows from their current created_at order, per user, so the
-- new column doesn't leave every pre-existing row tied at position 0.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc) - 1 as rn
  from public.library_assets
)
update public.library_assets la
set position = ranked.rn
from ranked
where ranked.id = la.id;

alter table public.library_assets alter column position drop default;

drop index if exists library_assets_user_created_idx;
create unique index if not exists library_assets_user_position_idx
  on public.library_assets (user_id, position);
