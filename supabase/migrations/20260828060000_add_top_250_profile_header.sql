-- Add Top 250 as a staff-exclusive profile header.

alter table public.profiles
  drop constraint if exists profiles_header_id_check;

alter table public.profiles
  add constraint profiles_header_id_check check (
    equipped_header_id in (
      'default',
      'platinum',
      'diamond',
      'crimson',
      'iridescent',
      'elovate-staff',
      'fragger',
      'top-250'
    )
  );
