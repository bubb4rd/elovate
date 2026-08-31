# WZ-06 — Profile privacy, themes, reputation smoke results

**Workstream:** WZ · **Priority:** P1

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `/players/[slug]` loads without seed/demo profiles | **PASS** | Profiles come from Supabase only; `ProfileView.source` is always `"user"` |
| 2 | Private profile honored for anon/other users | **PASS** | Page returns 404 via `notFound()`; metadata title is `"Private profile"` for non-owners |
| 3 | Reputation day-lock behaves as designed | **PASS** | `cast_profile_vote` RPC + `profile_votes` trigger; pgTAP in `profile_votes_rls.test.sql` |
| 4 | Themes persist; Staff/Fragger soft unlocks | **PASS** | `page_theme_id` saved to DB; headers grant/SR gated (`headers.test.ts`, `themes.test.ts`) |

## Automated checks

```bash
chmod +x scripts/wz-06-profile-smoke.sh
./scripts/wz-06-profile-smoke.sh
```

DB (local Supabase):

```bash
supabase test db -- supabase/tests/profile_votes_rls.test.sql
```

Also: `npm test` (headers, themes, search).

## Manual QA (production)

1. Toggle **Private profile** in `/settings/privacy` (saves immediately, no Save button) → open `/players/[slug]` in incognito → expect 404.
2. Owner still sees own profile when signed in.
3. Cast reputation vote on another profile → flip blocked until next UTC day.
4. Change page theme in `/settings/appearance` (saves immediately) → refresh → theme persists.

## Notes

- Privacy is enforced at the app layer (`notFound()`). RLS still allows `profiles` SELECT for all rows; climb rows are public-readable. Post-launch hardening optional.
