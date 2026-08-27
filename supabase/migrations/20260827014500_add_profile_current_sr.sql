-- Starting SR captured during first-run onboarding

alter table public.profiles
  add column if not exists current_sr integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_current_sr_check;

alter table public.profiles
  add constraint profiles_current_sr_check check (current_sr >= 0 and current_sr <= 100000);

revoke update on table public.profiles from authenticated;
grant update (
  slug,
  display_name,
  avatar_url,
  equipped_header_id,
  page_theme_id,
  preferred_mode,
  climb_goals,
  current_sr,
  onboarding_completed_at,
  updated_at
) on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (
  id,
  slug,
  display_name,
  avatar_url,
  preferred_mode,
  climb_goals,
  current_sr,
  onboarding_completed_at
) on table public.profiles to authenticated;
