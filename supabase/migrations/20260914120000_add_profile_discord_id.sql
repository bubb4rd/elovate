-- Discord identity link — profiles.discord_id, sourced from and kept in sync
-- with auth.identities (Supabase Auth's own record of linked providers).
--
-- Context: elovate-bot (a separate Discord bot project) needs to look up a
-- profile by Discord snowflake ID for /userinfo and /link. Linking itself
-- already works end-to-end today via src/components/profile/linked-accounts.tsx
-- (Supabase's native linkIdentity/unlinkIdentity, available to any account
-- regardless of whether it originally signed up via Discord or email OTP) —
-- this migration only adds a read path the bot's service-role key can query
-- directly, instead of needing cross-schema access into auth.identities.
--
-- Privacy: public.profiles has a blanket `grant select ... to anon,
-- authenticated` for public profile pages. Nothing public today exposes a
-- user's Discord identity — linked-accounts.tsx only ever reads the
-- signed-in user's own identities via getUserIdentities(). discord_id is
-- explicitly kept out of that public grant below so this migration doesn't
-- introduce a new public exposure; only service_role (the bot) can read it.

alter table public.profiles
  add column discord_id text unique;

create index profiles_discord_id_idx
  on public.profiles (discord_id)
  where discord_id is not null;

revoke select (discord_id) on public.profiles from anon, authenticated;

-- Backfill from whatever Discord identities are already linked today.
update public.profiles p
set discord_id = i.provider_id
from auth.identities i
where i.user_id = p.id
  and i.provider = 'discord';

-- Keep discord_id in sync going forward — any linkIdentity/unlinkIdentity
-- call against the 'discord' provider updates the matching profile row.
create or replace function private.sync_profile_discord_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.provider = 'discord' then
      update public.profiles set discord_id = null where id = old.user_id;
    end if;
    return old;
  end if;

  if new.provider = 'discord' then
    update public.profiles set discord_id = new.provider_id where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger on_auth_identity_discord_sync
  after insert or update or delete on auth.identities
  for each row execute function private.sync_profile_discord_id();

notify pgrst, 'reload schema';
