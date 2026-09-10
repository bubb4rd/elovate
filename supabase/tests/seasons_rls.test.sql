begin;
select plan(18);

select ok(
  not has_table_privilege('anon', 'public.seasons', 'insert'),
  'anon holds no insert grant on seasons'
);
select ok(
  not has_table_privilege('authenticated', 'public.seasons', 'insert'),
  'authenticated holds no insert grant on seasons'
);
select ok(
  not has_table_privilege('anon', 'public.seasons', 'update'),
  'anon holds no update grant on seasons'
);

set local role anon;
select results_eq(
  $$select id from public.seasons where is_active order by id$$,
  array['s5'],
  'anon reads active season'
);
select throws_ok(
  $$insert into public.seasons (id, name, starts_at, is_active)
    values ('sx', 'X', now(), false)$$,
  '42501',
  null,
  'anon cannot insert seasons'
);
select throws_ok(
  $$update public.seasons set phase_override = 'preseason' where is_active$$,
  '42501',
  null,
  'anon cannot pin phase_override'
);
select lives_ok(
  $$select * from public.active_season_phase()$$,
  'anon can execute active_season_phase()'
);
select is(
  (select count(*) from public.active_season_phase())::int,
  1,
  'active_season_phase() returns exactly one row'
);

set local role authenticated;
select results_eq(
  $$select id from public.seasons where is_active order by id$$,
  array['s5'],
  'authenticated reads active season'
);
select throws_ok(
  $$update public.seasons set is_active = false$$,
  '42501',
  null,
  'authenticated cannot update seasons'
);

-- --- Resolution branches (rules 1-5). One active test season, timestamps
-- --- relative to now(). Everything rolls back.
reset role;
update public.seasons set is_active = false;
insert into public.seasons (id, name, starts_at, ends_at, is_active)
values ('phase_test', 'Phase Test', now() - interval '30 days', null, true);

-- Rule 1: phase_override wins over the schedule.
update public.seasons
set phase_override = 'preseason', phase_updated_at = now()
where id = 'phase_test';
select is(
  (select phase from public.active_season_phase()),
  'preseason'::public.season_phase,
  'rule 1: phase_override pins the phase'
);
select is(
  (select is_override from public.active_season_phase()),
  true,
  'rule 1: is_override is true when pinned'
);

-- Rule 2: regular season (now < ends_at).
update public.seasons
set phase_override = null,
    ends_at = now() + interval '10 days',
    ranked_series_starts_at = null,
    ranked_series_ends_at = null
where id = 'phase_test';
select is(
  (select phase from public.active_season_phase()),
  'regular_season'::public.season_phase,
  'rule 2: before ends_at -> regular_season'
);

-- Rule 3: closed Ranked Series window (now < ranked_series_ends_at).
update public.seasons
set ends_at = now() - interval '1 day',
    ranked_series_starts_at = now() - interval '1 day',
    ranked_series_ends_at = now() + interval '3 days'
where id = 'phase_test';
select is(
  (select phase from public.active_season_phase()),
  'ranked_series'::public.season_phase,
  'rule 3: inside a closed Ranked Series window -> ranked_series'
);
select is(
  (select date_trunc('minute', phase_ends_at) from public.active_season_phase()),
  (select date_trunc('minute', now() + interval '3 days')),
  'rule 3: phase_ends_at is ranked_series_ends_at'
);

-- Rule 4: open-ended Ranked Series (ends set null, started).
update public.seasons
set ends_at = now() - interval '6 days',
    ranked_series_starts_at = now() - interval '2 days',
    ranked_series_ends_at = null
where id = 'phase_test';
select is(
  (select phase from public.active_season_phase()),
  'ranked_series'::public.season_phase,
  'rule 4: open-ended Ranked Series after its start -> ranked_series'
);
select is(
  (select phase_ends_at from public.active_season_phase()),
  null::timestamptz,
  'rule 4: open-ended Ranked Series has no phase_ends_at'
);

-- Rule 5: preseason (season over, no live series window).
update public.seasons
set ends_at = now() - interval '10 days',
    ranked_series_starts_at = null,
    ranked_series_ends_at = now() - interval '2 days'
where id = 'phase_test';
select is(
  (select phase from public.active_season_phase()),
  'preseason'::public.season_phase,
  'rule 5: season over and series window elapsed -> preseason'
);

select * from finish();
rollback;
