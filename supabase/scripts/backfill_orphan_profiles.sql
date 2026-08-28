-- One-off: create profile rows for auth.users missing from public.profiles
-- (accounts created before the signup trigger / profiles migration).
-- Safe to re-run: only inserts where no profile exists.

do $$
declare
  r record;
  meta jsonb;
  base text;
  candidate text;
  suffix integer;
  display text;
  avatar text;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    meta := coalesce(r.raw_user_meta_data, '{}'::jsonb);
    base := private.slugify(
      coalesce(
        meta ->> 'user_name',
        meta ->> 'preferred_username',
        meta ->> 'name',
        split_part(coalesce(r.email, ''), '@', 1),
        'player'
      )
    );
    candidate := base;
    suffix := 0;

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
      split_part(coalesce(r.email, ''), '@', 1),
      'Player'
    )), '');
    if display is null then
      display := 'Player';
    end if;
    display := left(display, 40);

    avatar := nullif(meta ->> 'avatar_url', '');

    insert into public.profiles (id, slug, display_name, avatar_url)
    values (r.id, candidate, display, avatar);
  end loop;
end $$;

-- Preview orphans before running:
-- select u.id, u.email, u.created_at
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;
