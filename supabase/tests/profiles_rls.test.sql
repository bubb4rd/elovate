begin;
select plan(12);

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
);

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
  not has_table_privilege('authenticated', 'public.profiles', 'insert'),
  'authenticated holds no insert grant on profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.profile_grants', 'insert'),
  'authenticated holds no insert grant on profile_grants'
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
