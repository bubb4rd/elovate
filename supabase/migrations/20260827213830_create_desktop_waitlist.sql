-- Public opt-in for elovate Desktop updates / beta invites.
-- Anon + authenticated may insert; no public select (ops via service_role).

create table public.desktop_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.profiles (id) on delete set null,
  want_updates boolean not null default true,
  want_beta boolean not null default false,
  source text not null default 'desktop_page',
  created_at timestamptz not null default now(),
  constraint desktop_waitlist_email_format check (
    email ~* '^[^@]+@[^@]+\.[^@]+$'
  ),
  constraint desktop_waitlist_source_len check (
    char_length(trim(source)) between 1 and 40
  ),
  constraint desktop_waitlist_interest check (want_updates or want_beta)
);

create unique index desktop_waitlist_email_unique
  on public.desktop_waitlist (lower(email));

create or replace function private.desktop_waitlist_normalize_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  new.source := trim(new.source);
  return new;
end;
$$;

create trigger desktop_waitlist_normalize_email
  before insert or update of email, source on public.desktop_waitlist
  for each row
  execute function private.desktop_waitlist_normalize_email();

alter table public.desktop_waitlist enable row level security;

revoke all on table public.desktop_waitlist from anon, authenticated;
grant insert on table public.desktop_waitlist to anon, authenticated;
grant all on table public.desktop_waitlist to service_role;

create policy "Anyone can join the desktop waitlist"
  on public.desktop_waitlist
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or (select auth.uid()) = user_id
  );
