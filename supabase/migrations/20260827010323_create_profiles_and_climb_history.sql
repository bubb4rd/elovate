create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.slugify(input text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(trim(coalesce(input, '')));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := substring(s from 1 for 24);
  if s is null or s = '' then
    return 'player';
  end if;
  return s;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  avatar_url text,
  equipped_header_id text not null default 'default',
  page_theme_id text not null default 'gold',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint profiles_display_name_len check (char_length(trim(display_name)) between 1 and 40),
  constraint profiles_header_id_check check (
    equipped_header_id in ('default', 'platinum', 'diamond', 'crimson', 'iridescent', 'elovate-staff')
  ),
  constraint profiles_theme_id_check check (
    page_theme_id in ('gold', 'platinum', 'diamond', 'crimson', 'iridescent')
  )
);

create table public.profile_grants (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  grant_id text not null,
  primary key (profile_id, grant_id),
  constraint profile_grants_id_check check (
    grant_id in ('elovate-staff')
  )
);

create table public.climb_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.mode not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_sr integer not null,
  unique (id, user_id)
);

create table public.climb_matches (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.climb_sessions (id) on delete cascade,
  mode public.mode not null,
  created_at timestamptz not null,
  sr_before integer not null,
  sr_after integer not null,
  net integer not null,
  placement text,
  squad_elims integer,
  your_elims integer,
  fee integer,
  placement_sr integer,
  elim_sr integer,
  capped boolean,
  sr_per_win integer,
  constraint climb_matches_placement_check check (
    placement is null or placement in ('first', 'top4', 'top6', 'top8', 'top10', 'top13', 'top15')
  ),
  constraint climb_matches_mode_fields check (
    (mode = 'wz' and placement is not null)
    or (mode = 'mp' and sr_per_win is not null)
  ),
  foreign key (session_id, user_id) references public.climb_sessions (id, user_id) on delete cascade
);

create index climb_sessions_user_mode_idx
  on public.climb_sessions (user_id, mode, started_at desc);

create index climb_matches_user_mode_created_idx
  on public.climb_matches (user_id, mode, created_at desc);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
  meta jsonb;
  display text;
  avatar text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base := private.slugify(
    coalesce(
      meta ->> 'user_name',
      meta ->> 'preferred_username',
      meta ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'player'
    )
  );
  candidate := base;

  loop
    exit when not exists (select 1 from public.profiles where slug = candidate);
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  display := nullif(trim(coalesce(
    meta ->> 'full_name',
    meta -> 'custom_claims' ->> 'global_name',
    meta ->> 'name',
    meta ->> 'user_name',
    split_part(coalesce(new.email, ''), '@', 1),
    'Player'
  )), '');
  if display is null then
    display := 'Player';
  end if;
  display := left(display, 40);

  avatar := nullif(meta ->> 'avatar_url', '');

  insert into public.profiles (id, slug, display_name, avatar_url)
  values (new.id, candidate, display, avatar);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_profile_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_grants enable row level security;
alter table public.climb_sessions enable row level security;
alter table public.climb_matches enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.profile_grants from anon, authenticated;
revoke all on table public.climb_sessions from anon, authenticated;
revoke all on table public.climb_matches from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant update (display_name, avatar_url, equipped_header_id, page_theme_id, updated_at)
  on table public.profiles to authenticated;

grant select on table public.profile_grants to anon, authenticated;

grant select on table public.climb_sessions to anon, authenticated;
grant insert, update, delete on table public.climb_sessions to authenticated;

grant select on table public.climb_matches to anon, authenticated;
grant insert, update, delete on table public.climb_matches to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.profile_grants to service_role;
grant all on table public.climb_sessions to service_role;
grant all on table public.climb_matches to service_role;

create policy "Anyone can read profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Owners can update their profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Anyone can read profile grants"
  on public.profile_grants
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can read climb sessions"
  on public.climb_sessions
  for select
  to anon, authenticated
  using (true);

create policy "Owners can insert climb sessions"
  on public.climb_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update climb sessions"
  on public.climb_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete climb sessions"
  on public.climb_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Anyone can read climb matches"
  on public.climb_matches
  for select
  to anon, authenticated
  using (true);

create policy "Owners can insert climb matches"
  on public.climb_matches
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update climb matches"
  on public.climb_matches
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete climb matches"
  on public.climb_matches
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "Avatar images are public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "Owners can upload avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners can update avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners can delete avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
