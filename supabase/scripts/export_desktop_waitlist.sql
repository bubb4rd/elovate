-- DESK-06: Export desktop waitlist for ops (run in SQL editor with service_role / dashboard)
-- Returns one row per unique email (case-insensitive), newest signup first.

select
  w.email,
  p.slug as user_slug,
  w.user_id,
  w.want_updates,
  w.want_beta,
  w.source,
  w.created_at
from public.desktop_waitlist w
left join public.profiles p on p.id = w.user_id
order by w.created_at desc;

-- Summary counts (optional):
-- select
--   count(*) as total,
--   count(*) filter (where want_updates) as want_updates,
--   count(*) filter (where want_beta) as want_beta,
--   count(*) filter (where user_id is not null) as signed_in
-- from public.desktop_waitlist;
