-- First-run onboarding fields on public.profiles

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists preferred_mode public.mode not null default 'wz',
  add column if not exists climb_goals text[] not null default '{}'::text[];

alter table public.profiles
  drop constraint if exists profiles_climb_goals_check;

alter table public.profiles
  add constraint profiles_climb_goals_check check (
    climb_goals <@ array['nextTier', 'nextDivision', 'iridescent', 'top250']::text[]
  );

-- Owners may set slug + onboarding fields once (and later via same RLS).
revoke update on table public.profiles from authenticated;
grant update (
  slug,
  display_name,
  avatar_url,
  equipped_header_id,
  page_theme_id,
  preferred_mode,
  climb_goals,
  onboarding_completed_at,
  updated_at
) on table public.profiles to authenticated;

-- Allow a signed-in user to create their own row if the signup trigger never ran
-- (e.g. account created before profiles migration).
grant insert (
  id,
  slug,
  display_name,
  avatar_url,
  preferred_mode,
  climb_goals,
  onboarding_completed_at
) on table public.profiles to authenticated;

drop policy if exists "Owners can insert their profile" on public.profiles;
create policy "Owners can insert their profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);
