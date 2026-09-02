-- Manually grant / extend / revoke elovate Pro (PREM-00).
--
-- Run from the Supabase SQL editor or `psql` (both run as a superuser / the
-- table owner, bypassing the "service-role writes only" column privilege).
-- This is the stopgap until the Stripe webhook writes `pro_until` itself.
--
-- Entitlement is `pro_until > now()`. To revoke, set it to a past timestamp
-- (or null).

-- 1. Preview the target profile:
-- select id, slug, display_name, pro_until from public.profiles where slug = 'PLAYER_SLUG';

-- 2. Grant a fixed window (e.g. a comped month), stacking on any existing runway:
update public.profiles
set pro_until = greatest(coalesce(pro_until, now()), now()) + interval '30 days'
where slug = 'PLAYER_SLUG';

-- 2b. Grant through a specific date instead (season pass):
-- update public.profiles set pro_until = timestamptz '2026-12-31 23:59:59+00'
-- where slug = 'PLAYER_SLUG';

-- 3. Revoke immediately:
-- update public.profiles set pro_until = null where slug = 'PLAYER_SLUG';

-- 4. Confirm:
-- select slug, pro_until, pro_until > now() as is_pro
-- from public.profiles where slug = 'PLAYER_SLUG';
