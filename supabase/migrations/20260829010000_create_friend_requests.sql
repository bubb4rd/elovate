create type public.friend_request_status as enum ('pending', 'accepted', 'declined');

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  addressee_id uuid not null,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_requester_id_fkey
    foreign key (requester_id) references public.profiles (id) on delete cascade,
  constraint friend_requests_addressee_id_fkey
    foreign key (addressee_id) references public.profiles (id) on delete cascade,
  constraint friend_requests_pair_key unique (requester_id, addressee_id),
  constraint friend_requests_no_self check (requester_id <> addressee_id)
);

create index friend_requests_addressee_pending_idx
  on public.friend_requests (addressee_id, created_at desc)
  where status = 'pending';

create index friend_requests_accepted_requester_idx
  on public.friend_requests (requester_id)
  where status = 'accepted';

create index friend_requests_accepted_addressee_idx
  on public.friend_requests (addressee_id)
  where status = 'accepted';

create or replace function private.friend_requests_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.requester_id is distinct from old.requester_id
    or new.addressee_id is distinct from old.addressee_id
    or new.created_at is distinct from old.created_at then
    -- Allow re-open after decline: created_at may be refreshed by send_friend_request.
    if not (
      old.status = 'declined'
      and new.status = 'pending'
      and new.requester_id is not distinct from old.requester_id
      and new.addressee_id is not distinct from old.addressee_id
      and new.id is not distinct from old.id
    ) then
      raise exception 'friend_request_fields_locked'
        using errcode = 'P0001';
    end if;
  end if;

  if old.status = 'declined' and new.status = 'pending' then
    new.responded_at := null;
    return new;
  end if;

  if old.status is distinct from 'pending' then
    raise exception 'friend_request_already_responded'
      using errcode = 'P0001';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('accepted', 'declined') then
    raise exception 'invalid_friend_request_status'
      using errcode = 'P0001';
  end if;

  new.responded_at := coalesce(new.responded_at, now());
  return new;
end;
$$;

create trigger friend_requests_before_update
  before update on public.friend_requests
  for each row
  execute function private.friend_requests_before_update();

alter table public.friend_requests replica identity full;
alter table public.friend_requests enable row level security;

revoke all on table public.friend_requests from anon, authenticated;
grant select, insert, delete on table public.friend_requests to authenticated;
grant update (status, responded_at) on table public.friend_requests to authenticated;
grant all on table public.friend_requests to service_role;

create policy "Parties can read their friend requests"
  on public.friend_requests
  for select
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );

create policy "Requesters can send friend requests"
  on public.friend_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'pending'
    and responded_at is null
  );

create policy "Addressees can respond to pending friend requests"
  on public.friend_requests
  for update
  to authenticated
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = addressee_id
    and status in ('accepted', 'declined')
  );

create policy "Parties can remove pending or accepted friend requests"
  on public.friend_requests
  for delete
  to authenticated
  using (
    (
      (select auth.uid()) = requester_id
      and status = 'pending'
    )
    or (
      (
        (select auth.uid()) = requester_id
        or (select auth.uid()) = addressee_id
      )
      and status = 'accepted'
    )
  );

create or replace function public.send_friend_request(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  reverse_row public.friend_requests%rowtype;
  existing public.friend_requests%rowtype;
  created public.friend_requests%rowtype;
begin
  if actor is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001', hint = 'Sign in to send a friend request.';
  end if;

  if actor = target_id then
    raise exception 'self_friend_request'
      using errcode = 'P0001', hint = 'You cannot friend yourself.';
  end if;

  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'profile_not_found'
      using errcode = 'P0001', hint = 'Profile not found.';
  end if;

  select * into existing
  from public.friend_requests
  where status = 'accepted'
    and (
      (requester_id = actor and addressee_id = target_id)
      or (requester_id = target_id and addressee_id = actor)
    )
  limit 1;

  if found then
    raise exception 'already_friends'
      using errcode = 'P0001', hint = 'You are already friends.';
  end if;

  select * into existing
  from public.friend_requests
  where requester_id = actor
    and addressee_id = target_id
    and status = 'pending'
  limit 1;

  if found then
    raise exception 'request_already_pending'
      using errcode = 'P0001', hint = 'Friend request already sent.';
  end if;

  select * into reverse_row
  from public.friend_requests
  where requester_id = target_id
    and addressee_id = actor
    and status = 'pending'
  limit 1;

  if found then
    update public.friend_requests
    set status = 'accepted', responded_at = now()
    where id = reverse_row.id
    returning * into created;

    return jsonb_build_object(
      'id', created.id,
      'status', 'friends',
      'request_id', created.id
    );
  end if;

  -- Re-send after a prior decline (or stale row): upsert to pending.
  insert into public.friend_requests (requester_id, addressee_id, status)
  values (actor, target_id, 'pending')
  on conflict (requester_id, addressee_id) do update
    set status = 'pending',
        responded_at = null,
        created_at = now()
  where public.friend_requests.status = 'declined'
  returning * into created;

  if created.id is null then
    raise exception 'request_already_pending'
      using errcode = 'P0001', hint = 'Friend request already sent.';
  end if;

  return jsonb_build_object(
    'id', created.id,
    'status', 'pending_out',
    'request_id', created.id
  );
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  row public.friend_requests%rowtype;
begin
  if actor is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001', hint = 'Sign in to respond.';
  end if;

  select * into row
  from public.friend_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'request_not_found'
      using errcode = 'P0001', hint = 'Friend request not found.';
  end if;

  if row.addressee_id is distinct from actor then
    raise exception 'not_addressee'
      using errcode = 'P0001', hint = 'Only the recipient can respond.';
  end if;

  if row.status is distinct from 'pending' then
    raise exception 'friend_request_already_responded'
      using errcode = 'P0001', hint = 'This request was already answered.';
  end if;

  update public.friend_requests
  set
    status = case when accept then 'accepted'::public.friend_request_status
                  else 'declined'::public.friend_request_status end,
    responded_at = now()
  where id = request_id
  returning * into row;

  return jsonb_build_object(
    'id', row.id,
    'status', case when accept then 'friends' else 'none' end,
    'request_id', row.id
  );
end;
$$;

create or replace function public.get_friend_status(target_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  row public.friend_requests%rowtype;
begin
  if actor is null then
    return jsonb_build_object('status', 'none');
  end if;

  if actor = target_id then
    return jsonb_build_object('status', 'none');
  end if;

  select * into row
  from public.friend_requests
  where status = 'accepted'
    and (
      (requester_id = actor and addressee_id = target_id)
      or (requester_id = target_id and addressee_id = actor)
    )
  limit 1;

  if found then
    return jsonb_build_object('status', 'friends', 'request_id', row.id);
  end if;

  select * into row
  from public.friend_requests
  where requester_id = actor
    and addressee_id = target_id
    and status = 'pending'
  limit 1;

  if found then
    return jsonb_build_object('status', 'pending_out', 'request_id', row.id);
  end if;

  select * into row
  from public.friend_requests
  where requester_id = target_id
    and addressee_id = actor
    and status = 'pending'
  limit 1;

  if found then
    return jsonb_build_object('status', 'pending_in', 'request_id', row.id);
  end if;

  return jsonb_build_object('status', 'none');
end;
$$;

create or replace function public.get_friend_leaderboard()
returns table (
  profile_id uuid,
  slug text,
  display_name text,
  avatar_url text,
  current_sr integer,
  rank integer,
  is_viewer boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'not_authenticated'
      using errcode = 'P0001', hint = 'Sign in to view the friend leaderboard.';
  end if;

  return query
  with member_ids as (
    select actor as id
    union
    select fr.addressee_id
    from public.friend_requests fr
    where fr.requester_id = actor
      and fr.status = 'accepted'
    union
    select fr.requester_id
    from public.friend_requests fr
    where fr.addressee_id = actor
      and fr.status = 'accepted'
  ),
  ranked as (
    select
      p.id as profile_id,
      p.slug,
      p.display_name,
      p.avatar_url,
      p.current_sr,
      (rank() over (order by p.current_sr desc, p.slug asc))::integer as rank,
      (p.id = actor) as is_viewer
    from public.profiles p
    inner join member_ids m on m.id = p.id
  )
  select
    ranked.profile_id,
    ranked.slug,
    ranked.display_name,
    ranked.avatar_url,
    ranked.current_sr,
    ranked.rank,
    ranked.is_viewer
  from ranked
  order by ranked.rank asc, ranked.slug asc;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to service_role;

revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to service_role;

revoke all on function public.get_friend_status(uuid) from public, anon;
grant execute on function public.get_friend_status(uuid) to authenticated;
grant execute on function public.get_friend_status(uuid) to service_role;

revoke all on function public.get_friend_leaderboard() from public, anon;
grant execute on function public.get_friend_leaderboard() to authenticated;
grant execute on function public.get_friend_leaderboard() to service_role;

alter publication supabase_realtime add table public.friend_requests;
