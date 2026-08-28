create type public.match_invite_status as enum ('pending', 'accepted', 'denied');

create table public.match_invites (
  id uuid primary key default gen_random_uuid(),
  source_match_id uuid not null,
  inviter_id uuid not null,
  invitee_id uuid not null,
  status public.match_invite_status not null default 'pending',
  accepted_match_id uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint match_invites_inviter_id_fkey
    foreign key (inviter_id) references public.profiles (id) on delete cascade,
  constraint match_invites_invitee_id_fkey
    foreign key (invitee_id) references public.profiles (id) on delete cascade,
  constraint match_invites_source_match_id_fkey
    foreign key (source_match_id) references public.climb_matches (id) on delete cascade,
  constraint match_invites_accepted_match_id_fkey
    foreign key (accepted_match_id) references public.climb_matches (id) on delete set null,
  constraint match_invites_source_invitee_key unique (source_match_id, invitee_id),
  constraint match_invites_no_self check (inviter_id <> invitee_id)
);

create index match_invites_invitee_pending_idx
  on public.match_invites (invitee_id, created_at desc)
  where status = 'pending';

create index match_invites_source_idx
  on public.match_invites (source_match_id);

create or replace function private.match_invites_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.inviter_id is distinct from old.inviter_id
    or new.invitee_id is distinct from old.invitee_id
    or new.source_match_id is distinct from old.source_match_id
    or new.created_at is distinct from old.created_at then
    raise exception 'invite_fields_locked'
      using errcode = 'P0001';
  end if;

  if old.status is distinct from 'pending' then
    raise exception 'invite_already_responded'
      using errcode = 'P0001';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('accepted', 'denied') then
    raise exception 'invalid_invite_status'
      using errcode = 'P0001';
  end if;

  if new.status = 'denied' then
    new.accepted_match_id := null;
  elsif new.accepted_match_id is null then
    raise exception 'accepted_match_required'
      using errcode = 'P0001';
  elsif not exists (
    select 1
    from public.climb_matches m
    where m.id = new.accepted_match_id
      and m.user_id = new.invitee_id
  ) then
    raise exception 'accepted_match_not_owned'
      using errcode = 'P0001';
  end if;

  new.responded_at := coalesce(new.responded_at, now());
  return new;
end;
$$;

create trigger match_invites_before_update
  before update on public.match_invites
  for each row
  execute function private.match_invites_before_update();

alter table public.match_invites replica identity full;
alter table public.match_invites enable row level security;

revoke all on table public.match_invites from anon, authenticated;
grant select, insert, delete on table public.match_invites to authenticated;
grant update (status, accepted_match_id, responded_at) on table public.match_invites to authenticated;
grant all on table public.match_invites to service_role;

create policy "Parties can read their match invites"
  on public.match_invites
  for select
  to authenticated
  using (
    (select auth.uid()) = inviter_id
    or (select auth.uid()) = invitee_id
  );

create policy "Inviters can send match invites"
  on public.match_invites
  for insert
  to authenticated
  with check (
    (select auth.uid()) = inviter_id
    and status = 'pending'
    and accepted_match_id is null
    and exists (
      select 1
      from public.climb_matches m
      where m.id = source_match_id
        and m.user_id = inviter_id
    )
  );

create policy "Invitees can respond to pending invites"
  on public.match_invites
  for update
  to authenticated
  using (
    (select auth.uid()) = invitee_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = invitee_id
    and status in ('accepted', 'denied')
  );

create policy "Inviters can retract pending invites"
  on public.match_invites
  for delete
  to authenticated
  using (
    (select auth.uid()) = inviter_id
    and status = 'pending'
  );

alter publication supabase_realtime add table public.match_invites;
