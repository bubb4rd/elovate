-- Profile privacy + notification preferences

alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists notify_cutoff boolean not null default true,
  add column if not exists notify_climb boolean not null default false;

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
  is_private,
  notify_cutoff,
  notify_climb,
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
  is_private,
  notify_cutoff,
  notify_climb,
  onboarding_completed_at
) on table public.profiles to authenticated;
