# WZ-03 — Climb cloud sync smoke results

**Workstream:** WZ · **Priority:** P0

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Signed-in climb history pushes to Supabase (`climb_sessions`, `climb_matches`) | **PASS** | `pushCloudHistory` upserts scoped rows; `cloud.test.ts` |
| 2 | Local save succeeds even when cloud push fails | **PASS** | `createHistoryStore.save` writes localStorage first, schedules debounced push |
| 3 | Visible failure UI when cloud sync fails | **PASS** | `SessionPanel` banner + `MatchSubmitReceipt` error state |
| 4 | User can retry sync without losing local session | **PASS** | `Retry sync` → `flushHistoryPush(mode)` via `useHistory.retrySync` |
| 5 | Page hide / tab hide flushes pending push | **PASS** | `registerPageHideFlush` in `synced-store.ts` |
| 6 | Full signed-in match log E2E on prod | **MANUAL** | Sign in → `/wz/calc` → log match → refresh → history persists |

## Automated checks

```bash
chmod +x scripts/wz-03-climb-sync-smoke.sh
./scripts/wz-03-climb-sync-smoke.sh
```

Also: `npm test` (includes `cloud.test.ts`, `merge.test.ts`, `sessions.test.ts`).

## Manual QA (production)

1. Sign in → open `/wz/calc` → log a match → session panel shows the game.
2. Refresh — match still present (local + cloud).
3. Optional failure test: DevTools offline after a match → banner shows “Couldn’t sync climb history” → go online → **Retry sync** clears banner.
4. Submit receipt shows error copy if save/sync fails on teammate step.

## Notes

- Cloud sync requires Supabase env on Netlify (`NEXT_PUBLIC_SUPABASE_URL`, anon key). Unsigned users keep local-only history.
- Re-run manual sync test before launch freeze (see [LAUNCH_ROADMAP.md](./LAUNCH_ROADMAP.md) §5 step 3).
