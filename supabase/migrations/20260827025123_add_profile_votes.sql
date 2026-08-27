create table public.profile_votes (
  voter_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (voter_id, profile_id),
  constraint profile_votes_no_self check (voter_id <> profile_id)
);

create index profile_votes_profile_id_idx on public.profile_votes (profile_id);

create or replace function private.profile_votes_enforce_daily_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.value is distinct from old.value then
    if (old.updated_at at time zone 'utc')::date = (now() at time zone 'utc')::date then
      raise exception 'vote_change_locked'
        using errcode = 'P0001',
          hint = 'You can change this vote again tomorrow (UTC).';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger profile_votes_enforce_daily_change
  before update on public.profile_votes
  for each row
  execute function private.profile_votes_enforce_daily_change();

alter table public.profile_votes enable row level security;

revoke all on table public.profile_votes from anon, authenticated;
grant select on table public.profile_votes to anon, authenticated;
grant insert, update on table public.profile_votes to authenticated;
grant all on table public.profile_votes to service_role;

create policy "Anyone can read profile votes"
  on public.profile_votes
  for select
  to anon, authenticated
  using (true);

create policy "Voters can insert their own votes"
  on public.profile_votes
  for insert
  to authenticated
  with check ((select auth.uid()) = voter_id);

create policy "Voters can update their own votes"
  on public.profile_votes
  for update
  to authenticated
  using ((select auth.uid()) = voter_id)
  with check ((select auth.uid()) = voter_id);

-- Logic lives here; SECURITY DEFINER so auth.uid() is available and writes
-- are not blocked by missing grants for edge callers. Daily lock also enforced
-- by private.profile_votes_enforce_daily_change on direct table updates.
create or replace function public.cast_profile_vote(target_id uuid, vote smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  voter uuid := auth.uid();
  existing public.profile_votes%rowtype;
  ups_count integer;
  downs_count integer;
  can_change boolean;
begin
  if voter is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001', hint = 'Sign in to vote.';
  end if;

  if vote is null or vote not in (-1, 1) then
    raise exception 'invalid_vote'
      using errcode = 'P0001', hint = 'Vote must be +1 or -1.';
  end if;

  if voter = target_id then
    raise exception 'self_vote'
      using errcode = 'P0001', hint = 'You cannot vote on your own profile.';
  end if;

  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'profile_not_found'
      using errcode = 'P0001', hint = 'Profile not found.';
  end if;

  select * into existing
  from public.profile_votes
  where voter_id = voter and profile_id = target_id;

  if found then
    if existing.value is distinct from vote then
      if (existing.updated_at at time zone 'utc')::date = (now() at time zone 'utc')::date then
        raise exception 'vote_change_locked'
          using errcode = 'P0001',
            hint = 'You can change this vote again tomorrow (UTC).';
      end if;
      update public.profile_votes
      set value = vote, updated_at = now()
      where voter_id = voter and profile_id = target_id;
    end if;
  else
    insert into public.profile_votes (voter_id, profile_id, value)
    values (voter, target_id, vote);
  end if;

  select
    count(*) filter (where value = 1),
    count(*) filter (where value = -1)
  into ups_count, downs_count
  from public.profile_votes
  where profile_id = target_id;

  select * into existing
  from public.profile_votes
  where voter_id = voter and profile_id = target_id;

  can_change := (existing.updated_at at time zone 'utc')::date
    < (now() at time zone 'utc')::date;

  return jsonb_build_object(
    'ups', ups_count,
    'downs', downs_count,
    'viewer_vote', existing.value,
    'can_change_vote', can_change
  );
end;
$$;

revoke all on function public.cast_profile_vote(uuid, smallint) from public, anon;
grant execute on function public.cast_profile_vote(uuid, smallint) to authenticated;
grant execute on function public.cast_profile_vote(uuid, smallint) to service_role;
