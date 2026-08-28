# WZ-02 — Onboarding edge-case smoke results

**Date:** 2026-08-28  
**Environment:** https://elovatesr.netlify.app  
**Supabase project:** `ioagctykwkspbwzyrfcb` (elovate)  
**Verifier:** automated checks + code/RLS review

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Auth user with no `profiles` row is treated as onboarding-incomplete | **PASS** | `getViewerProfile()` returns `onboardingComplete: false` when row missing ([`viewer.ts`](../src/lib/auth/viewer.ts)). Middleware gate redirects when `onboarding_completed_at` is null or row absent ([`update-session.ts`](../src/lib/supabase/update-session.ts)). |
| 2 | `/onboarding` insert path creates own profile row | **PASS** | `saveOnboarding()` inserts when `profileExists: false` ([`onboarding.ts`](../src/lib/profile/onboarding.ts)). RLS policy `Owners can insert their profile` + column grants include `current_sr` ([`20260827014500_add_profile_current_sr.sql`](../supabase/migrations/20260827014500_add_profile_current_sr.sql)). DB test covers orphan insert ([`profiles_rls.test.sql`](../supabase/tests/profiles_rls.test.sql)). |
| 3 | Prefill from auth metadata when profile missing | **PASS** | Onboarding page reads `user_metadata` for display name, slug, avatar when no row ([`onboarding/page.tsx`](../src/app/onboarding/page.tsx)). |
| 4 | Protected routes gate incomplete users | **PASS** | Unauthenticated `/onboarding` and `/settings` redirect to login with `next` preserved. Signed-in incomplete users redirected by session middleware (except `/onboarding`, `/auth/*`). `postAuthPath` unit tests pass. |
| 5 | Legacy orphan accounts can be backfilled | **PASS** (script) | Ops script [`backfill_orphan_profiles.sql`](../supabase/scripts/backfill_orphan_profiles.sql) mirrors `handle_new_user` slug logic. Re-run safe. |
| 6 | Full wizard E2E on prod (orphan account) | **MANUAL** | Requires browser: sign in as user with no profile row → complete wizard → lands on `/players/[slug]`. |

## Automated checks

Run from repo root:

```bash
chmod +x scripts/wz-02-onboarding-smoke.sh
./scripts/wz-02-onboarding-smoke.sh
```

DB RLS (local Supabase):

```bash
supabase test db -- supabase/tests/profiles_rls.test.sql
```

Also: `npm test` (includes `paths.test.ts`).

## Ops: orphan profile backfill

Preview orphans in SQL editor:

```sql
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

If any exist, run [`supabase/scripts/backfill_orphan_profiles.sql`](../supabase/scripts/backfill_orphan_profiles.sql) in the SQL editor (creates incomplete profile rows; users still finish via `/onboarding`).

## Notes

- New signups get a profile via `private.handle_new_user` trigger; orphan path is for pre-migration accounts only.
- Onboarding wizard uses **update** when trigger created a row with `onboarding_completed_at` null, **insert** when row is missing.
- Re-run manual orphan wizard test before launch freeze (see [LAUNCH_ROADMAP.md](./LAUNCH_ROADMAP.md) §5 step 5).
