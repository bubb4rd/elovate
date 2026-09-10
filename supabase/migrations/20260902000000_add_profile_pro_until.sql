-- elovate Pro entitlement (PREM-00)
--
-- `pro_until` is the single source of truth for Pro access. Entitlement is
-- `pro_until > now()` — a timestamp, never a boolean, so lapses and one-time
-- season passes expire on their own with no cron.
--
-- Publicly readable by design: a Pro badge (PREM-25) is meant to be visible, and
-- the value is only a subscription end date. Billing identifiers (Stripe customer
-- id etc.) are NOT stored here — they land in a separate owner-only table with the
-- Stripe integration PR.
--
-- Not writable by `authenticated`: no column grant is added below, so a signed-in
-- user cannot set their own `pro_until`. Only `service_role` (Stripe webhook, or
-- the manual grant in supabase/scripts/grant_pro.sql) can.

alter table public.profiles
  add column if not exists pro_until timestamptz;

comment on column public.profiles.pro_until is
  'elovate Pro access expiry. Entitlement = pro_until > now(). Service-role writes only.';
