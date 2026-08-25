begin;
select plan(6);

select ok(
  not has_table_privilege('anon', 'public.seasons', 'insert'),
  'anon holds no insert grant on seasons'
);
select ok(
  not has_table_privilege('authenticated', 'public.seasons', 'insert'),
  'authenticated holds no insert grant on seasons'
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

select * from finish();
rollback;
