-- Replace exclusive header id `elovate-staff` with `fragger`.
-- Grant id stays `elovate-staff` and unlocks Fragger in app logic.

update public.profiles
set equipped_header_id = 'fragger'
where equipped_header_id = 'elovate-staff';

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
      'fragger'
    )
  );
