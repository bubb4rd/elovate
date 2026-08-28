begin;
select plan(8);

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
  'voter@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"voter"}'::jsonb,
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
  'target@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"target"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  (public.cast_profile_vote('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1::smallint) ->> 'viewer_vote')::int = 1,
  'voter can cast +1'
);

select throws_ok(
  $$select public.cast_profile_vote('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1::smallint)$$,
  'P0001',
  null,
  'self vote rejected'
);

select ok(
  (public.cast_profile_vote('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -1::smallint) ->> 'viewer_vote')::int = 1,
  'same-day flip via RPC is ignored (vote stays +1)'
);

update public.profile_votes
  set updated_at = now() - interval '1 day'
  where voter_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select ok(
  (public.cast_profile_vote('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -1::smallint) ->> 'viewer_vote')::int = -1,
  'flip allowed after UTC day boundary'
);

update public.profile_votes
  set updated_at = now()
  where voter_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select throws_ok(
  $$update public.profile_votes
      set value = 1
      where voter_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        and profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'P0001',
  null,
  'direct table flip blocked same UTC day'
);

select ok(
  (public.cast_profile_vote('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -1::smallint) ->> 'can_change_vote')::boolean = false,
  'can_change_vote false after voting today'
);

reset role;
set local role anon;

select ok(
  not has_table_privilege('anon', 'public.profile_votes', 'insert'),
  'anon cannot insert profile votes'
);

select * from finish();
rollback;
