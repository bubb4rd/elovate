begin;
select plan(15);

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
  'inviter@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"inviter"}'::jsonb,
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
  'invitee@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"invitee"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
), (
  '00000000-0000-0000-0000-000000000000',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'authenticated',
  'authenticated',
  'stranger@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"stranger"}'::jsonb,
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
  not has_table_privilege('anon', 'public.match_invites', 'select'),
  'anon holds no select grant on match_invites'
);
select ok(
  not has_table_privilege('anon', 'public.match_invites', 'insert'),
  'anon holds no insert grant on match_invites'
);

set local role anon;
select throws_ok(
  $$select id from public.match_invites$$,
  '42501',
  null,
  'anon cannot read match invites'
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
  $$insert into public.match_invites (id, source_match_id, inviter_id, invitee_id)
    values (
      '33333333-3333-3333-3333-333333333333',
      '22222222-2222-2222-2222-222222222222',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    )$$,
  'inviter can send an invite for their match'
);

select throws_ok(
  $$insert into public.match_invites (source_match_id, inviter_id, invitee_id)
    values (
      '22222222-2222-2222-2222-222222222222',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )$$,
  '23514',
  null,
  'cannot invite yourself'
);

select is(
  (select count(*)::int from public.match_invites),
  1,
  'inviter can read their sent invite'
);

reset role;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.match_invites),
  0,
  'stranger cannot read other peoples invites'
);

select throws_ok(
  $$insert into public.match_invites (source_match_id, inviter_id, invitee_id)
    values (
      '22222222-2222-2222-2222-222222222222',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'cccccccc-cccc-cccc-cccc-cccccccccccc'
    )$$,
  '42501',
  null,
  'cannot send an invite as another user'
);

update public.match_invites
  set status = 'denied'
  where id = '33333333-3333-3333-3333-333333333333';

reset role;
select is(
  (
    select status::text
    from public.match_invites
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  'pending',
  'stranger cannot respond to an invite'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.match_invites),
  1,
  'invitee can read pending invites'
);

select throws_ok(
  $$update public.match_invites
    set status = 'accepted'
    where id = '33333333-3333-3333-3333-333333333333'$$,
  'P0001',
  null,
  'cannot accept without posting a match'
);

delete from public.match_invites
  where id = '33333333-3333-3333-3333-333333333333';
select is(
  (
    select count(*)::int
    from public.match_invites
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  1,
  'invitee cannot retract an invite'
);

insert into public.climb_sessions (id, user_id, mode, started_at, ended_at, start_sr)
values (
  '44444444-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'wz',
  timestamptz '2026-08-26 13:00:00+00',
  null,
  9000
);

insert into public.climb_matches (
  id, user_id, session_id, mode, created_at, sr_before, sr_after, net,
  placement, squad_elims, your_elims, fee, placement_sr, elim_sr, capped
) values (
  '55555555-5555-5555-5555-555555555555',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '44444444-4444-4444-4444-444444444444',
  'wz',
  timestamptz '2026-08-26 13:05:00+00',
  9000,
  9050,
  50,
  'top6',
  8,
  3,
  50,
  50,
  50,
  false
);

select lives_ok(
  $$update public.match_invites
    set status = 'accepted',
        accepted_match_id = '55555555-5555-5555-5555-555555555555'
    where id = '33333333-3333-3333-3333-333333333333'$$,
  'invitee can accept after posting the match'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

delete from public.match_invites
  where id = '33333333-3333-3333-3333-333333333333';
select is(
  (
    select count(*)::int
    from public.match_invites
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  1,
  'inviter cannot retract after accept'
);

insert into public.match_invites (id, source_match_id, inviter_id, invitee_id)
values (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

select lives_ok(
  $$delete from public.match_invites
    where id = '66666666-6666-6666-6666-666666666666'$$,
  'inviter can retract a pending invite'
);

select * from finish();
rollback;
