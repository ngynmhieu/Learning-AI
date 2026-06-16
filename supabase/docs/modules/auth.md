# Schema: `auth` module — `profiles`

> Per-module schema doc — the database half of the `auth` feature. Mirrors how
> the backend/frontend document each module. Read `../supabase_guidelines.md`
> first for the migration workflow and rules. The backend service that reads/writes
> this table is documented in `backend/docs/modules/auth.md`.

## Status

**Built.** Source fragment `supabase/schema/auth/profiles.sql`; applied migration
`supabase/migrations/20260613082710_create_profiles.sql`, pushed to the cloud with
`supabase db push`.

## Why this is a SQL migration (not SQLAlchemy)

`profiles` foreign-keys into Supabase's internal `auth.users` table and uses Row
Level Security — neither of which SQLAlchemy `create_all` can express. So the
table + FK + RLS live in the migration; `backend/app/modules/auth/models.py` is
only the backend's ORM read/write view of it.

## `profiles`

One row per Supabase auth user, sharing the **same UUID** (1-to-1 with
`auth.users`).

```sql
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: a user can only read/update their own profile.
alter table public.profiles enable row level security;

create policy "Profiles are viewable by the owner"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);
```

## Notes

- **Rows are written by the backend**, not a DB trigger: `POST /auth/me` →
  `AuthService.sync_profile` upserts the row. Business logic stays in the service
  layer. See `backend/docs/modules/auth.md`.
- **RLS caveat.** The backend connects via `asyncpg` as a privileged role, so
  `auth.uid()` is not populated on backend queries — RLS here protects Supabase's
  auto-exposed REST API only (defense-in-depth). The backend enforces ownership
  itself.
