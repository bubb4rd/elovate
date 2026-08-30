-- Default avatar for new users without an OAuth photo.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
  meta jsonb;
  display text;
  avatar text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base := private.slugify(
    coalesce(
      meta ->> 'user_name',
      meta ->> 'preferred_username',
      meta ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'player'
    )
  );
  candidate := base;

  loop
    exit when not exists (select 1 from public.profiles where slug = candidate);
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;

  display := nullif(trim(coalesce(
    meta ->> 'full_name',
    meta -> 'custom_claims' ->> 'global_name',
    meta ->> 'name',
    meta ->> 'user_name',
    split_part(coalesce(new.email, ''), '@', 1),
    'Player'
  )), '');
  if display is null then
    display := 'Player';
  end if;
  display := left(display, 40);

  avatar := coalesce(nullif(meta ->> 'avatar_url', ''), '/profile/default-avatar.png');

  insert into public.profiles (id, slug, display_name, avatar_url)
  values (new.id, candidate, display, avatar);

  return new;
end;
$$;
