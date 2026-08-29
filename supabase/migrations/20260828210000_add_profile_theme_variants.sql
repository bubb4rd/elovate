alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check check (
    page_theme_id in (
      'gold',
      'silver',
      'platinum',
      'diamond',
      'crimson',
      'iridescent',
      'ember',
      'ocean',
      'forest',
      'nebula'
    )
  );
