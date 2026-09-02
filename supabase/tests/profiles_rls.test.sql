begin;
select plan(18);

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
  '{"user_name":"bode","full_name":"bode"}'::jsonb,
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
), (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'authenticated',
  'authenticated',
  'orphan@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"user_name":"legacy","full_name":"Legacy Player"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

delete from public.profiles
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

select is(
  (select slug from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'bode',
  'signup trigger creates a profile slug from user_name'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'insert'),
  'anon holds no insert grant on profiles'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'slug', 'INSERT'),
  'authenticated can insert granted profile columns'
);
select ok(
  not has_table_privilege('authenticated', 'public.profile_grants', 'insert'),
  'authenticated holds no insert grant on profile_grants'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'pro_until', 'UPDATE'),
  'authenticated cannot update pro_until (Pro entitlement is service-role only)'
);
select is(
  (select count(*)::int from public.profiles where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0,
  'orphan auth user has no profile row'
);

set local role anon;
select results_eq(
  $$select slug from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['bode'],
  'anon reads profiles'
);
select throws_ok(
  $$insert into public.profiles (id, slug, display_name)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'hack', 'Hack')$$,
  '42501',
  null,
  'anon cannot insert profiles'
);

reset role;
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.profiles (
      id,
      slug,
      display_name,
      preferred_mode,
      climb_goals,
      current_sr,
      onboarding_completed_at
    ) values (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'legacy-player',
      'Legacy Player',
      'wz',
      array['top250']::text[],
      4200,
      now()
    )$$,
  'orphan auth user can insert own profile during onboarding'
);
select is(
  (select slug from public.profiles where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'legacy-player',
  'orphan onboarding insert persists slug'
);
select throws_ok(
  $$insert into public.profiles (
      id,
      slug,
      display_name,
      preferred_mode,
      climb_goals,
      current_sr,
      onboarding_completed_at
    ) values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'stolen',
      'Stolen',
      'wz',
      array['top250']::text[],
      1,
      now()
    )$$,
  '42501',
  null,
  'authenticated cannot insert profile for another user id'
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
  $$update public.profiles
    set display_name = 'Bode'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'owner can update display_name'
);
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Bode',
  'owner update persists'
);
select is(
  (select slug from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'bode',
  'owner cannot change slug via granted columns'
);
select throws_ok(
  $$insert into public.profile_grants (profile_id, grant_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'elovate-staff')$$,
  '42501',
  null,
  'authenticated cannot grant staff'
);
select throws_ok(
  $$update public.profiles
    set pro_until = now() + interval '30 days'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'owner cannot self-grant elovate Pro'
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
  (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Bode',
  'other user still sees owner profile'
);
update public.profiles
  set display_name = 'Stolen'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Bode',
  'other user cannot update owner profile'
);

select * from finish();
rollback;
