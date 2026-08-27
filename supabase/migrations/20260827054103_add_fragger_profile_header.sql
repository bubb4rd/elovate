-- Add Fragger as an additional exclusive header; keep elovate-staff.

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
      'fragger'
    )
  );
