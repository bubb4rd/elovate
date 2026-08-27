begin;
select plan(7);

select ok(
  has_table_privilege('anon', 'public.desktop_waitlist', 'insert'),
  'anon can insert desktop_waitlist'
);
select ok(
  has_table_privilege('authenticated', 'public.desktop_waitlist', 'insert'),
  'authenticated can insert desktop_waitlist'
);
select ok(
  not has_table_privilege('anon', 'public.desktop_waitlist', 'select'),
  'anon cannot select desktop_waitlist'
);
select ok(
  not has_table_privilege('authenticated', 'public.desktop_waitlist', 'select'),
  'authenticated cannot select desktop_waitlist'
);

set local role anon;
select lives_ok(
  $$insert into public.desktop_waitlist (email, want_updates, want_beta, source)
    values ('beta@example.com', true, true, 'desktop_page')$$,
  'anon can join waitlist'
);
select throws_ok(
  $$select email from public.desktop_waitlist$$,
  '42501',
  null,
  'anon cannot read waitlist rows'
);

set local role authenticated;
select throws_ok(
  $$insert into public.desktop_waitlist (email, user_id, want_updates, want_beta)
    values ('spoof@example.com', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, false)$$,
  '42501',
  null,
  'authenticated cannot attach another user_id'
);

select * from finish();
rollback;
