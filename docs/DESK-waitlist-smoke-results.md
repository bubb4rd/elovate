# DESK — Desktop waitlist smoke results

**Workstream:** Desktop · **Priority:** P0 (DESK-01–05), P1 (DESK-06), P2 (DESK-07)

## Item status

| ID | Item | Result | Evidence |
|---|---|---|---|
| DESK-01 | `/desktop` coming-soon page | **PASS** | `src/app/desktop/page.tsx`, hero + waitlist sections |
| DESK-02 | Home teaser → `/desktop` | **PASS** | `DesktopHomeTeaser` on home page below ModePick |
| DESK-03 | Opt-in form (email, toggles) | **PASS** | `desktop-waitlist-form.tsx`; signed-in users prefill email via `user_id` |
| DESK-04 | `desktop_waitlist` + RLS | **PASS** | Migration `20260827213830_create_desktop_waitlist.sql`; pgTAP test |
| DESK-05 | Dedupe + confirmation UX | **PASS** | Unique `lower(email)` index; “You’re on the list” / “already on the list” |
| DESK-06 | Ops export SQL | **PASS** | `supabase/scripts/export_desktop_waitlist.sql` |
| DESK-07 | Nav/footer Desktop link | **PASS** | `site-footer.tsx`, `site-nav.tsx` |

## Automated checks

```bash
chmod +x scripts/desk-waitlist-smoke.sh
./scripts/desk-waitlist-smoke.sh
```

DB (local Supabase):

```bash
supabase test db -- supabase/tests/desktop_waitlist_rls.test.sql
```

## Manual QA (production)

1. Visit `/desktop` — hero, what’s coming, waitlist form render.
2. Logged out: submit email + toggles → “You’re on the list.”
3. Re-submit same email → “You’re already on the list.”
4. Home page teaser links to `/desktop`.
5. Ops: run `export_desktop_waitlist.sql` in Supabase SQL editor to verify rows.

## Notes

- Discord contact is captured implicitly when user signs in (`user_id` FK to `profiles`); no separate Discord handle field.
- Re-submit does not update toggle preferences (by design for launch).
