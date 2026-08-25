begin;
select plan(10);

insert into public.snapshots (
  season_id, mode, captured_at, source, cutoff_sr, rank1_sr, player_count
) values (
  's5', 'wz', timestamptz '2026-08-25 12:00:00+00', 'codmunity', 12000, 30000, 250
);

select ok(
  not has_table_privilege('anon', 'public.snapshots', 'insert'),
  'anon holds no insert grant on snapshots'
);
select ok(
  not has_table_privilege('anon', 'public.snapshots', 'update'),
  'anon holds no update grant on snapshots'
);
select ok(
  not has_table_privilege('anon', 'public.snapshots', 'delete'),
  'anon holds no delete grant on snapshots'
);
select ok(
  not has_table_privilege('authenticated', 'public.snapshots', 'insert'),
  'authenticated holds no insert grant on snapshots'
);

set local role anon;
select results_eq(
  $$select cutoff_sr from public.snapshots where season_id = 's5'$$,
  array[12000],
  'anon reads snapshots'
);
select throws_ok(
  $$insert into public.snapshots (season_id, mode, captured_at, cutoff_sr, rank1_sr, player_count)
    values ('s5', 'wz', now(), 1, 1, 1)$$,
  '42501',
  null,
  'anon cannot insert snapshots'
);
select throws_ok(
  $$update public.snapshots set cutoff_sr = 0$$,
  '42501',
  null,
  'anon cannot update snapshots'
);
select throws_ok(
  $$delete from public.snapshots$$,
  '42501',
  null,
  'anon cannot delete snapshots'
);

set local role authenticated;
select results_eq(
  $$select cutoff_sr from public.snapshots where season_id = 's5'$$,
  array[12000],
  'authenticated reads snapshots'
);
select throws_ok(
  $$insert into public.snapshots (season_id, mode, captured_at, cutoff_sr, rank1_sr, player_count)
    values ('s5', 'wz', now(), 1, 1, 1)$$,
  '42501',
  null,
  'authenticated cannot insert snapshots'
);

select * from finish();
rollback;
