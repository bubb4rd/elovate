create type public.mode as enum ('wz', 'mp');
create type public.snapshot_source as enum ('codmunity');

create table public.seasons (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default false
);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons (id) on delete restrict,
  mode public.mode not null,
  captured_at timestamptz not null,
  source public.snapshot_source not null default 'codmunity',
  cutoff_sr integer not null,
  rank1_sr integer not null,
  player_count integer not null,
  unique (season_id, mode, captured_at)
);

create index snapshots_lookup_idx
  on public.snapshots (mode, season_id, captured_at desc);

insert into public.seasons (id, name, starts_at, ends_at, is_active)
values
  ('s4', 'Season 4', timestamptz '2026-05-01 10:12:00+00', timestamptz '2026-07-23 23:12:00+00', false),
  ('s5', 'Season 5', timestamptz '2026-07-24 10:12:00+00', null, true);

alter table public.seasons enable row level security;
alter table public.snapshots enable row level security;

revoke all on table public.seasons from anon, authenticated;
revoke all on table public.snapshots from anon, authenticated;

grant select on table public.seasons to anon, authenticated;
grant select on table public.snapshots to anon, authenticated;
grant all on table public.seasons to service_role;
grant all on table public.snapshots to service_role;

create policy "Anyone can read seasons"
  on public.seasons
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can read snapshots"
  on public.snapshots
  for select
  to anon, authenticated
  using (true);
