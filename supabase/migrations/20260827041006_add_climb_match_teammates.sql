alter table public.climb_matches
  add column teammates jsonb not null default '[]'::jsonb;

alter table public.climb_matches
  add constraint climb_matches_teammates_is_array
  check (jsonb_typeof(teammates) = 'array');

alter table public.climb_matches
  add constraint climb_matches_teammates_len
  check (jsonb_array_length(teammates) <= 3);
