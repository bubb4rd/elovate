begin;
select plan(16);

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
  'alice@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"alice"}'::jsonb,
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
  'bob@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"bob"}'::jsonb,
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
  'carol@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"carol"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

update public.profiles
set current_sr = 12000, is_private = true
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update public.profiles
set current_sr = 15000, is_private = false
where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

update public.profiles
set current_sr = 9000
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select ok(
  not has_table_privilege('anon', 'public.friend_requests', 'select'),
  'anon holds no select grant on friend_requests'
);

set local role anon;
select throws_ok(
  $$select id from public.friend_requests$$,
  '42501',
  null,
  'anon cannot read friend requests'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  (public.send_friend_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') ->> 'status') = 'pending_out',
  'alice can send friend request to bob'
);

select throws_ok(
  $$select public.send_friend_request('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'P0001',
  null,
  'self friend request rejected'
);

select throws_ok(
  $$select public.send_friend_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  'P0001',
  null,
  'duplicate pending request rejected'
);

select is(
  (public.get_friend_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') ->> 'status'),
  'pending_out',
  'alice sees pending_out toward bob'
);

reset role;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (public.get_friend_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ->> 'status'),
  'pending_in',
  'bob sees pending_in from alice'
);

select ok(
  (public.respond_friend_request(
    (select id from public.friend_requests
      where requester_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        and addressee_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    true
  ) ->> 'status') = 'friends',
  'bob can accept alice request'
);

select is(
  (public.get_friend_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ->> 'status'),
  'friends',
  'bob sees friends status'
);

select ok(
  exists (
    select 1 from public.get_friend_leaderboard()
    where profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and current_sr = 12000
      and is_viewer = false
  ),
  'bob leaderboard includes private alice with SR'
);

select ok(
  (
    select rank from public.get_friend_leaderboard()
    where profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ) = 1,
  'bob ranks first by higher SR'
);

reset role;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.send_friend_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  'carol can request bob'
);

reset role;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  (public.send_friend_request('cccccccc-cccc-cccc-cccc-cccccccccccc') ->> 'status') = 'friends',
  'bob requesting carol auto-accepts reverse pending'
);

select is(
  (select count(*)::int from public.get_friend_leaderboard()),
  3,
  'bob leaderboard includes self and two friends'
);

select lives_ok(
  $$delete from public.friend_requests
    where status = 'accepted'
      and (
        (requester_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
          and addressee_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        or (requester_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
          and addressee_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      )$$,
  'bob can unfriend alice'
);

select is(
  (public.get_friend_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ->> 'status'),
  'none',
  'after unfriend status is none'
);

select * from finish();
rollback;
