-- One row per signed-in user: what the app syncs between their devices.
-- Station ids only; no listening history beyond the per-station taste tally.
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  favourites text[] not null default '{}',
  recents text[] not null default '{}',
  taste jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  -- Generous caps so a buggy or hostile client cannot store megabytes.
  constraint favourites_size check (cardinality(favourites) <= 1000),
  constraint recents_size check (cardinality(recents) <= 100),
  constraint taste_size check (pg_column_size(taste) <= 262144)
);

-- The server clock decides which copy is newer, so device clocks don't matter.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- In-app account deletion (required by Google Play and the App Store).
-- Deleting the auth user cascades to the profile row.
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
