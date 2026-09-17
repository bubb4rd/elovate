-- Audit log for admin-triggered season mutations (phase set/clear/schedule,
-- rollover), performed via the /season command in elovate-bot (a separate
-- Discord bot project — see supabase/scripts/set_season_phase.sql for the
-- SQL-only fallback path these same actions can also be taken through).
--
-- Context: elovate-bot's /season command previously only logged to Discord's
-- own message history — no queryable, durable record of who changed season
-- state or when. This table is that record; elovate-bot inserts into it after
-- every successful mutation.

create table public.season_admin_actions (
  id bigint generated always as identity primary key,
  action text not null,
  actor_discord_id text not null,
  actor_discord_username text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.season_admin_actions is
  'Audit trail for /season mutations (phase set/clear/schedule, rollover). Written by elovate-bot via the service-role key.';

create index season_admin_actions_created_at_idx
  on public.season_admin_actions (created_at desc);

alter table public.season_admin_actions enable row level security;

-- Service-role only — this is an internal audit log, not public site data.
revoke all on public.season_admin_actions from anon, authenticated;
grant select, insert on public.season_admin_actions to service_role;

notify pgrst, 'reload schema';
