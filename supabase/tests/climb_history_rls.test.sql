begin;
select plan(10);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'owner@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"owner"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
), (
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'authenticated',
  'authenticated',
  'other@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"other"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into public.climb_sessions (id, user_id, mode, started_at, ended_at, start_sr)
values (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'wz',
  timestamptz '2026-08-26 12:00:00+00',
  null,
  10000
);

insert into public.climb_matches (
  id, user_id, session_id, mode, created_at, sr_before, sr_after, net,
  placement, squad_elims, your_elims, fee, placement_sr, elim_sr, capped
) values (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'wz',
  timestamptz '2026-08-26 12:20:00+00',
  10000,
  10080,
  80,
  'top6',
  8,
  3,
  50,
  50,
  80,
  false
);

select ok(
  not has_table_privilege('anon', 'public.climb_matches', 'insert'),
  'anon holds no insert grant on climb_matches'
);

set local role anon;
select results_eq(
  $$select net from public.climb_matches$$,
  array[80],
  'anon reads climb matches'
);
select throws_ok(
  $$insert into public.climb_sessions (id, user_id, mode, started_at, start_sr)
    values (
      '33333333-3333-3333-3333-333333333333',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'wz',
      now(),
      1
    )$$,
  '42501',
  null,
  'anon cannot insert climb sessions'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.climb_sessions (id, user_id, mode, started_at, start_sr)
    values (
      '33333333-3333-3333-3333-333333333333',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'mp',
      now(),
      900
    )$$,
  'owner can insert climb sessions'
);
select lives_ok(
  $$insert into public.climb_matches (
      id, user_id, session_id, mode, created_at, sr_before, sr_after, net, sr_per_win
    ) values (
      '44444444-4444-4444-4444-444444444444',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '33333333-3333-3333-3333-333333333333',
      'mp',
      now(),
      900,
      950,
      50,
      50
    )$$,
  'owner can insert climb matches'
);
select lives_ok(
  $$delete from public.climb_matches where id = '44444444-4444-4444-4444-444444444444'$$,
  'owner can delete own matches'
);

reset role;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$insert into public.climb_sessions (id, user_id, mode, started_at, start_sr)
    values (
      '55555555-5555-5555-5555-555555555555',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'wz',
      now(),
      1
    )$$,
  '42501',
  null,
  'other user cannot insert sessions for owner'
);
delete from public.climb_matches where id = '22222222-2222-2222-2222-222222222222';
select is(
  (
    select count(*)::int
    from public.climb_matches
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  1,
  'other user cannot delete owner matches'
);

select throws_ok(
  $$insert into public.climb_matches (
      id, user_id, session_id, mode, created_at, sr_before, sr_after, net, placement
    ) values (
      '66666666-6666-6666-6666-666666666666',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '11111111-1111-1111-1111-111111111111',
      'wz',
      now(),
      1,
      2,
      1,
      'first'
    )$$,
  '23503',
  null,
  'cannot attach a match to another users session'
);

delete from public.climb_sessions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select count(*)::int from public.climb_sessions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'other user cannot delete owner sessions'
);

select * from finish();
rollback;
