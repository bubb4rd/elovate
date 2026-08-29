create or replace function public.get_pending_friend_requests()
returns table (
  id uuid,
  created_at timestamptz,
  requester_id uuid,
  requester_slug text,
  requester_display_name text,
  requester_avatar_url text
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
      using errcode = 'P0001', hint = 'Sign in to view friend requests.';
  end if;

  return query
  select
    fr.id,
    fr.created_at,
    r.id as requester_id,
    r.slug as requester_slug,
    r.display_name as requester_display_name,
    r.avatar_url as requester_avatar_url
  from public.friend_requests fr
  inner join public.profiles r on r.id = fr.requester_id
  where fr.addressee_id = actor
    and fr.status = 'pending'
  order by fr.created_at desc;
end;
$$;

revoke all on function public.get_pending_friend_requests() from public, anon;
grant execute on function public.get_pending_friend_requests() to authenticated;
grant execute on function public.get_pending_friend_requests() to service_role;

-- Ensure PostgREST can see friend_requests relationships for direct selects.
notify pgrst, 'reload schema';
