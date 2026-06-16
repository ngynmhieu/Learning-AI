-- Desired shape of public.profiles (auth module).
-- Source of truth for "what this table should look like now". The applied
-- migration is supabase/migrations/20260613082710_create_profiles.sql.
-- See supabase/docs/modules/auth.md.

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
