# elovate — launch-readiness action plan (T-6 days)

**Source:** senior-architect review 2026-09-01 (overall readiness **76/100 — on track**).
**Freeze:** Sat Sep 5 – Sun Sep 6. **Launch:** Mon Sep 7.
**Go/no-go:** Go, conditional on P0 items OPS-07 / WZ-11 / WZ-12 landing before Sep 5 (all bugfix-shaped → freeze-legal if they slip) and the Sep 5–7 QA re-run (OPS-09).

> Numbering note: `OPS-07` was the next free OPS id (OPS-01…06 exist). WZ-09/WZ-10 are taken,
> so WZ starts at WZ-11.

### Tracking issues (created 2026-09-01)

| ID | Issue | ID | Issue |
|---|---|---|---|
| OPS-07 | [#34](https://github.com/bubb4rd/elovate/issues/34) | OPS-10 | [#40](https://github.com/bubb4rd/elovate/issues/40) |
| OPS-08 | [#35](https://github.com/bubb4rd/elovate/issues/35) | WZ-13 | [#41](https://github.com/bubb4rd/elovate/issues/41) |
| WZ-11 | [#36](https://github.com/bubb4rd/elovate/issues/36) | WZ-14 | [#42](https://github.com/bubb4rd/elovate/issues/42) |
| WZ-12 | [#37](https://github.com/bubb4rd/elovate/issues/37) | OPS-11 | [#43](https://github.com/bubb4rd/elovate/issues/43) |
| OPS-13 | [#38](https://github.com/bubb4rd/elovate/issues/38) | OPS-12 | [#44](https://github.com/bubb4rd/elovate/issues/44) |
| OPS-09 | [#39](https://github.com/bubb4rd/elovate/issues/39) | DESK-08 | [#45](https://github.com/bubb4rd/elovate/issues/45) |
| | | WZ-15 | [#46](https://github.com/bubb4rd/elovate/issues/46) |

---

## 1. Phasing

| ID | Item | Phase | Land by | Freeze-legal? |
|---|---|---|---|---|
| OPS-07 | `player_count` floor guard in `poll-wz-cutoff` → deploy v8 | 0 | Sep 2 | Yes — fail-closed bugfix |
| OPS-08 | Preflight config verification (`db-max-rows`, migration parity, Netlify env, Auth URLs, purge smoke rows) | 0 | Sep 2 | Yes — no code |
| WZ-11 | Bound the stored snapshot history query (window + season anchor) | 0 | Sep 3 | Yes — bugfix; **do not defer** — degrades silently once the row cap is hit (see WZ-11 Context) |
| WZ-12 | Stop serving `generate.ts` rows/cutoff as live data | 0 | Sep 4 EOD | Yes as bugfix; 7 files + copy — land before freeze, reduced-scope variant if it slips |
| OPS-13 | Scope-freeze declaration (no new surface after Sep 4) | 0 | Sep 2 | Decision, not code |
| — | Close #22 (OPS-05 soft-launch checklist) once OPS-08/09 absorb it | 0 | Sep 2 | Housekeeping |
| OPS-09 | Sep 5–7 QA re-verification checklist (absorbs #7 mobile, #17 MP gate, stale-signoff items, friends/history/settings) | 1 | Sep 6 EOD | Yes — human only |
| OPS-10 | Launch-day runbook + monitoring cadence + Discord threshold expectation | 2 | Sep 7 | Yes |
| WZ-13 | Profile privacy RLS hardening (migration) | 3 | Post | **Post** — exception required to land earlier |
| WZ-14 | `metadataBase` + OpenGraph/Twitter cards | 3 | Post (or Sep 4 if WZ-12 already green) | Feature — exception required after Sep 5 |
| OPS-11 | Snapshot freshness alerting | 3 | Post | Post |
| OPS-12 | Wire `discord.test.ts` into CI | 3 | Post | Post |
| DESK-08 | Waitlist insert throttle | 3 | Post | Post |
| WZ-15 | Retire `generate.ts` seed data entirely | 3 | Post | Post |

### Dependencies

- **OPS-08 → WZ-11 priority.** The `db-max-rows` answer decides whether WZ-11 is time-critical or merely hygiene. WZ-11 ships either way; the answer says whether it can slip a day. (Live check 2026-09-01 22:00 UTC: 668 rows, REST returns all 668 — `content-range: 0-667/668` — no truncation yet; cap value still unconfirmed.)
- **OPS-08 → any new migration** (WZ-13). Migration parity must be confirmed first — this repo already ate one drift incident (LAUNCH-QA §3).
- **WZ-11 then WZ-12, sequentially, in one agent** — both edit `src/lib/data/live-history.ts`. WZ-11 first (smaller; adds the descending-limit query shape WZ-12 reuses).
- **WZ-11 + WZ-12 deployed → OPS-09.** Don't QA a build you're about to replace.
- **OPS-07 is independent** (Edge Function runtime, no shared files) — do it first, it's ~10 lines.
- **OPS-09 → OPS-10.** Runbook cadence assumes QA passed.

### Day-by-day

| Day | Work |
|---|---|
| **Wed Sep 2** | OPS-08 preflight (~30 min, human). OPS-07 branch → PR → merge → `supabase functions deploy poll-wz-cutoff` (**v8**). Declare scope freeze effective Sep 4 (OPS-13). Close #22. |
| **Thu Sep 3** | WZ-11: implement, unit tests, PR, review, merge, confirm Netlify deploy. Spot-check home 24h delta vs SQL. |
| **Fri Sep 4** | WZ-12: implement, tests, PR, review, merge, deploy. **Hard cutoff — last day non-trivial code lands.** If WZ-12 not merged by EOD, ship the reduced-scope variant instead. Optional: WZ-14 OG metadata iff WZ-12 already green. |
| **Sat Sep 5** | Freeze begins. OPS-09 part 1: desktop browser — all 10 QA §5 steps + settings tabs + history filters + friends. File regressions as `bug`-labeled issues only. |
| **Sun Sep 6** | OPS-09 part 2: real-phone mobile pass (closes #7), MP gate reconfirm (#17), waitlist dedupe, cross-device magic link, cold Discord OAuth. Fix only `bug`-labeled regressions. Tag `v1.0-wz`. |
| **Mon Sep 7** | OPS-10 runbook: pre-announce console sweep, announce, post-announce sweep. No code unless a P0 regression appears. |

---

## 2. Implementation plans

### OPS-07 — `player_count` floor guard (P0 · Phase 0 · freeze-legal)

N-02 is deployed as **v7**; this guard makes it **v8**. Branch `ops-07-player-count-floor` off
`master` (PR #32 is merged at `dda0d5f`, cannot absorb it). Local checkout is on
`n-02-discord-cutoff-webhook` @ `f20b2eb` — `git checkout master && git pull` first.

**File:** `supabase/functions/poll-wz-cutoff/index.ts` — insert between the `srs.length === 0`
check and `const capturedAt`, i.e. **before** both the insert and `maybeNotifyDiscordCutoff`:

```ts
const MIN_PLAYERS = (() => {
  const parsed = Number(Deno.env.get("MIN_PLAYER_COUNT"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 240;
})();

if (srs.length < MIN_PLAYERS) {
  console.error("[poll-wz-cutoff] short payload", {
    playerCount: srs.length,
    minPlayers: MIN_PLAYERS,
  });
  return Response.json(
    { skipped: true, reason: "short_payload", playerCount: srs.length },
    { status: 200 },
  );
}
```

Why 240: prod returns `player_count: 249` steadily → ~4% headroom. Env-overridable via
`MIN_PLAYER_COUNT`, mirroring `MIN_CUTOFF_DELTA` in `discord.ts`.

**Also:** `.env.example` — add `# MIN_PLAYER_COUNT=240`. `docs/OPS-06-error-monitoring.md` —
add expected-vs-incident row: `"skipped":true,"reason":"short_payload"` → **Warn** (partial board,
ingest correctly skipped; repeated = page).

**Verify:** deploy → `curl -X POST .../poll-wz-cutoff -H "x-cron-secret: $CRON_SECRET"` within the
12-min throttle → `{"skipped":true,"reason":"fresh"}` (proves v8 boots with no side effects). Then
confirm two cron cycles still insert (`captured_at` +15 min, `player_count` ≈ 249).

**Rollback:** redeploy previous commit. Guard is fail-closed — worst case it over-skips and OPS-04
freshness catches it.

**Do not** add this to `npm test` (Deno runtime) — cover in the Deno test file, pick up via OPS-12.

---

### WZ-11 — Bound the stored snapshot query (P0 · Phase 0 · freeze-legal)

**Files:** `src/lib/data/live-history.ts`, `src/lib/data/cutoff-window.ts`, `src/lib/data/live-history.test.ts`

**Context / how urgent this actually is.** `getStoredCutoffSnapshots` (`live-history.ts:33-38`,
confirmed) selects every season snapshot, `captured_at ASC`, no `.limit()`, no time filter — on
every SSR render. 668 rows on 2026-09-01, growing 95.7/day. A live REST call today returns all 668
(`content-range: 0-667/668`) → no truncation yet. **The exact `db-max-rows` cap for project
`ioagctykwkspbwzyrfcb` is unverified** (Management API token unavailable this session) — OPS-08
records it. If it is the oft-cited Supabase default of **1000**:

- PostgREST applies `LIMIT 1000` *after* `ORDER BY captured_at ASC` → it keeps the **oldest** 1000
  rows and drops the newest.
- Crosses 1000 around **Sep 5 ~05:00 UTC** (arithmetic). Nothing visibly breaks at that point —
  `avgPerDaySeason` reads `snapshots[0]` (oldest, unaffected) and `change24h`'s 24h-ago baseline row
  is still within the retained window. You get a growing gap at the recent end of the sparkline only.
- The **silently-wrong headline number** — `change24h` computed against a 30h-, then multi-day-old
  baseline and still labelled "24h" — begins once truncation eats past 24h of data, i.e. total
  > ~1096 rows → **Sep 6 ~05:00 UTC**.

So: still inside the launch window, still a real defect, but not a Sep-5 cliff. Fix regardless —
this is the correct query shape — and let OPS-08's cap reading decide whether Sep 3 can slip to Sep 4.

**The trap:** naively adding `.gte("captured_at", …)` silently breaks `avgPerDaySeason` —
`avgPerDayFromCutoffs` (`cutoff-window.ts:31-33`) uses `snapshots[0]` as the *season start* anchor.
Window the array and the "season average" quietly becomes an 8-day average. **Split the query.**

```ts
const WINDOW_DAYS = 8;   // 7d avg needs 7 days + margin
const MAX_ROWS = 1200;   // 8d * 96/day = 768; headroom, still under any 1000-cap surprise

// Windowed rows for the 24h series and 7d average.
export async function getRecentCutoffSnapshots(mode, seasonId): Promise<StoredCutoff[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  // …
    .gte("captured_at", since)
    .order("captured_at", { ascending: true })
    .limit(MAX_ROWS);
}

// Single oldest row — the season anchor for avgPerDaySeason.
export async function getSeasonAnchorCutoff(mode, seasonId): Promise<StoredCutoff | null> {
  // …
    .order("captured_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}
```

`cutoff-window.ts`: `avgPerDayFromCutoffs(snapshots, live)` → `(snapshots, live, anchor)`, use
`anchor ?? snapshots[0]` for the season calc (line 31); 7d path keeps reading `snapshots`.
`windowCutoffHistory` needs no signature change (24h lookback only). `liveWzHistoryFor` (line 49)
issues both queries via `Promise.all` and threads the anchor through.

**Tests** (extend `live-history.test.ts`, already in `npm test`):
1. Anchor passed separately → same `avgPerDaySeason` as current full-array behavior on a 14-day fixture.
2. Window with no row older than 24h → `change24h: null`, `series: []` (honest empty state, not a wrong number).
3. `avgPerDay7d` still resolves with exactly 7 days + 1 row.

**Verify on prod:** home `24h` delta must equal
`latest.cutoff_sr − (cutoff_sr of newest snapshot ≤ now−24h)` from the LAUNCH-QA SQL (~23,7xx today).

**Rollback:** revert; unbounded query returns, safe until the row cap is actually crossed.

---

### WZ-12 — Stop serving fabricated board data (P0 · Phase 0 · freeze-legal, land by Sep 4)

**Files:**
- `src/lib/data/live-history.ts` — add `getLatestStoredCutoff(mode, seasonId)` (descending, `limit(1)`)
- **new** `src/lib/data/board-source.ts` + `board-source.test.ts`
- `src/components/tracker-page.tsx` (lines 38-58, 66, 103)
- `src/app/page.tsx` (lines 24-35)
- reuse sites: `src/app/history/page.tsx:25-34`, `src/app/friends/page.tsx:25-34`,
  `src/app/players/[slug]/page.tsx:62-71`, `src/app/settings/layout.tsx:36-45`,
  `src/components/calc-page.tsx:21-31`

```ts
// board-source.ts
export type CutoffSource = "live" | "stored" | "none";
export type ResolvedCutoff = {
  source: CutoffSource;
  cutoffSr: number;
  rank1Sr: number;
  capturedAt: string;
};
// 1. getLiveWzBoard()                       -> source "live"
// 2. getLatestStoredCutoff("wz", seasonId)  -> source "stored"
// 3. null                                   -> source "none"
```

Two rules the implementation must satisfy:

1. **Never render `db()` rows for the active WZ season.** In `tracker-page.tsx`,
   `rows = live?.rows ?? (isLiveWzBoard(mode, seasonId) ? null : board?.rows)`.
   `isLiveWzBoard` exists at `src/lib/data/queries.ts:155`. Archived seasons (`/wz/s/s4`) keep seed
   rows, unchanged.
2. **Never render a seed cutoff numeral as current.** Every
   `live && seedMetrics ? overlayLiveMetrics(…) : seedMetrics` → `… : storedMetrics ?? null`.
   `source === "none"` → existing "No snapshot for this season yet." path, not a number.

**Copy when `source === "stored"`** (one line above the board, and under the home numeral):
`Live standings unavailable. Showing the last recorded cutoff from {relative time}.` — reuse
`src/components/snapshot-time-chip.tsx`. No new component.

**Test:** new `board-source.test.ts` added to the `test` script in `package.json` — live / stored /
none, injected fetchers, no network.

**Verify:** DevTools-block `api.codmunity.gg` (QA §5 step 10 procedure), load `/` and `/wz`. Expect:
cutoff still ~23,7xx from the stored snapshot, stale-data line present, **zero** synthetic
gamertags (`Nzr`, `Klyra`, `Ryn`, `Sable`) anywhere in the DOM.

**Reduced-scope variant if it slips past Sep 4 EOD:** rule 1 only (~5 lines in `tracker-page.tsx`,
no new file, no copy, no test changes) — live-fetch failure shows the existing empty state instead
of 250 invented players. Worse UX, but removes the fabrication and is defensible inside the freeze.

**Rollback:** revert; seed fallback returns.

**Root cause note:** `lastGood` in `src/lib/data/codmunity.ts:19` is a module-level var → empty on
every Netlify cold start, so the seed fallback is the *default* cold-instance behavior during a
CODMunity outage, not a rare edge. WZ-15 retires it entirely, post-launch.

---

### OPS-08 — Preflight config verification (P0 · Phase 0 · no code)

Human/CLI, ~30 min, all read-only:

1. `supabase migration list --linked` — confirm `20260829010000`, `20260829020000`,
   `20260830200000` in **both** columns. (Tables confirmed on prod via REST; history rows are what drift.)
2. Supabase → Settings → API → **Max rows**. Record it and comment it on WZ-11. If `1000`: home 24h
   figure starts silently misreporting around **Sep 6 ~05:00 UTC** (see WZ-11 Context) — WZ-11 stays
   Sep 3. If unset / higher: WZ-11 is hygiene and may slip to Sep 4.
3. Netlify production context env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_SITE_URL`, and whether `GOOGLE_CLOUD_CREDENTIALS` is set (OCR live vs soft-fail — the
   runbook needs to know which; either is fine per WZ-07).
4. Supabase → Auth → URL Configuration matches `supabase/config.toml`.
5. Delete the `wz01-smoke-test` profile row + its `auth.users` record (prod has 9 profiles; ≥1 is a
   smoke artifact, visible in user search on day one).

---

### OPS-13 — Scope-freeze declaration (Phase 0 · decision)

Two unplanned workstreams landed in the final week, neither in the QA matrix:
- Friends requests + SR leaderboard (`a15e317`, Aug 29) — two migrations, absent from LAUNCH_ROADMAP §2
- N-02 Discord webhook (PR #32, merged Sep 1) — listed **Post** in §2D, named under §1 "Explicitly
  out of Sep 7 scope"

Both were legal (freeze starts Sep 5) but expanded untested surface at T-7.

**Decision requested:** feature freeze effective **Sep 4 EOD** (one day ahead of the roadmap freeze).
After Sep 4, only `bug`-labeled work merges; anything else needs an explicit exception recorded in
`docs/LAUNCH_ROADMAP.md` §8 decision log. Confirm friends + `/history` + settings tabs are in scope
for OPS-09.

---

### Phase 3 (post-launch) — condensed specs

- **WZ-13 privacy RLS** — new migration under `supabase/migrations/`. Replace the blanket `profiles`
  SELECT policy with `is_private = false OR id = auth.uid() OR <friend of auth.uid()>`. Requires
  auditing every server read (`src/lib/profile/queries.ts`, `search.ts`, `friends/*`) — the app reads
  via the publishable key and relies on app-layer filtering today. Blast radius currently **zero**
  (0 private profiles); stops being zero the first day a user toggles privacy. **Post** — an RLS
  change next to a freeze is disproportionate risk.
- **WZ-14 OG metadata** — `src/app/layout.tsx:17-24`: add
  `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://elovatesr.netlify.app")`,
  `openGraph`, `twitter: { card: "summary_large_image" }`, an `opengraph-image` route, and reword the
  description (still says "Ranked Multiplayer" while MP is gated). One file + an image asset.
  Freeze-legal only by explicit exception after Sep 5.
- **OPS-11 alerting** — pg_cron job (hourly) querying `max(captured_at)` on `snapshots`; if older
  than 45 min, POST to the same `DISCORD_CUTOFF_WEBHOOK_URL` N-02 uses. Schedule SQL alongside
  `supabase/cron/schedule_poll_wz_cutoff.sql`.
- **OPS-12** — add a `test:functions` script running `deno test supabase/functions/poll-wz-cutoff/`,
  document it, reference from `docs/AGENT_PIPELINE.md`. Deno isn't a dev dependency → genuinely Post.
- **DESK-08 throttle** — mirror `src/lib/ocr/rate-limit.ts` in front of `joinDesktopWaitlist`
  (`src/lib/desktop/waitlist.ts`), or a Postgres per-IP policy. Table is insert-only, no public
  select → worst case is junk rows an ops export filters. Accept for launch.
- **WZ-15** — retire `src/lib/data/generate.ts` for archived seasons too, backed by real `snapshots`
  history. Removes the class of bug WZ-12 patches. Also: `codmunity.ts:115` `unstable_cache` → Next 16
  `use cache` directive; still functional, migrate when Cache Components are adopted.

**Discord threshold tuning (decide before promising anyone alerts):** `MIN_CUTOFF_DELTA` defaults to
50 and compares *consecutive 15-minute snapshots*. Observed consecutive deltas are 0–45 (`+41`,
`-4`, `+28`), so the webhook will almost never fire. If community engagement is the goal, compare
against a rolling daily baseline instead. (Currently set to `27` on prod for smoke visibility.)

---

## 3. GitHub issue drafts

Convention: `[WORKSTREAM-NN] Sentence`, labels `p0`/`p1`/`p2`/`post` + `workstream:*` + `launch`,
milestone `Launch Sep 7`. **Confirm free IDs with `gh issue list --state all` before creating.**

Create the two missing labels first:

```bash
gh label create p2   --description "Nice if capacity"        --color FBCA04
gh label create post --description "Post-launch fast-follow"  --color C2E0C6
```

<details>
<summary><strong>OPS-07 — player_count floor guard</strong> (Phase 0)</summary>

```bash
gh issue create --title "[OPS-07] Guard poll-wz-cutoff against short CODMunity payloads" \
  --label p0,workstream:ops,launch,bug --milestone "Launch Sep 7" --body '
## Context
`poll-wz-cutoff` writes `cutoff_sr = srs[srs.length - 1]` for any non-empty payload
(`supabase/functions/poll-wz-cutoff/index.ts:81-102`). Prod returns `player_count: 249` steadily,
so a partial payload is plausible. A short list writes a bogus cutoff, poisons the 24h delta and
home sparkline, and since N-02 (v7) also broadcasts it to Discord.

## Change
Floor check after the `srs.length === 0` guard and BEFORE the insert, so a short payload neither
writes nor posts:

```ts
const MIN_PLAYERS = Number(Deno.env.get("MIN_PLAYER_COUNT")) || 240;
if (srs.length < MIN_PLAYERS) {
  console.error("[poll-wz-cutoff] short payload", { playerCount: srs.length });
  return Response.json({ skipped: true, reason: "short_payload", playerCount: srs.length });
}
```

Branch off `master` (PR #32 merged at `dda0d5f`). Deploy is v8.

## Acceptance criteria
- [ ] Guard sits before both `admin.from("snapshots").insert` and `maybeNotifyDiscordCutoff`
- [ ] Threshold env-overridable via `MIN_PLAYER_COUNT`, default 240
- [ ] `.env.example` documents `# MIN_PLAYER_COUNT=240`
- [ ] `docs/OPS-06-error-monitoring.md` gains a `short_payload` row (Warn)
- [ ] Deployed as v8; probe within throttle returns `{"skipped":true,"reason":"fresh"}`
- [ ] Two subsequent cron cycles insert normally with `player_count` ~249

## Files
- `supabase/functions/poll-wz-cutoff/index.ts`
- `.env.example`, `docs/OPS-06-error-monitoring.md`

Phase 0 (by Sep 2). Freeze-legal: yes, fail-closed bugfix.'
```
</details>

<details>
<summary><strong>OPS-08 — launch preflight</strong> (Phase 0)</summary>

```bash
gh issue create --title "[OPS-08] Launch preflight: db-max-rows, migration parity, env + smoke-row purge" \
  --label p0,workstream:ops,launch --milestone "Launch Sep 7" --body '
## Context
Read-only verification of things that cannot be confirmed from the repo. Blocks prioritisation of
WZ-11: if `db-max-rows` is the oft-cited Supabase default 1000, the unbounded snapshot query starts
returning stale/wrong 24h numbers on the home page around Sep 6 (see WZ-11). Value unverified this
session (Management API token unavailable).

## Checklist
- [ ] `supabase migration list --linked` — `20260829010000`, `20260829020000`, `20260830200000`
      present in BOTH local and remote columns (tables confirmed via REST; history rows unconfirmed)
- [ ] Supabase -> Settings -> API -> **Max rows**: record value, comment it on WZ-11
- [ ] Netlify production env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `NEXT_PUBLIC_SITE_URL` set; record whether `GOOGLE_CLOUD_CREDENTIALS` is set (OCR live vs soft-fail)
- [ ] Supabase -> Auth -> URL Configuration matches `supabase/config.toml`
- [ ] Delete `wz01-smoke-test` profile + auth user (prod has 9 profiles; this one is a smoke artifact)

Phase 0 (by Sep 2). No code.'
```
</details>

<details>
<summary><strong>WZ-11 — bound the stored snapshot query</strong> (Phase 0)</summary>

```bash
gh issue create --title "[WZ-11] Bound the stored snapshot query so 24h/7d stats cannot silently truncate" \
  --label p0,workstream:wz,launch,bug --milestone "Launch Sep 7" --body '
## Context
`getStoredCutoffSnapshots` (`src/lib/data/live-history.ts:33-38`) selects EVERY snapshot for the
season, `captured_at ASC`, no `.limit()`, no time filter — on every SSR render of `/`, `/wz`,
`/wz/calc`, `/players/[slug]`, `/friends`, `/history`, `/settings`.

668 rows on 2026-09-01, +95.7/day. Live REST check returns all 668 (`content-range: 0-667/668`) —
no truncation yet. The project `db-max-rows` cap is **unverified** (OPS-08 records it). If it is the
oft-cited Supabase default 1000: PostgREST applies `LIMIT 1000` after `ORDER BY captured_at ASC`, so
it keeps the OLDEST 1000 rows. `avgPerDaySeason` (reads `snapshots[0]`) and the 24h baseline stay
correct until truncation eats past 24h of data — total > ~1096 rows, i.e. **~Sep 6 05:00 UTC** — at
which point `nearestAtLeastHoursAgo` (`cutoff-window.ts:12-20`) returns a 30h-, then multi-day-old
row still labelled "24h" and the home page shows a plausible but badly inflated delta. Not a Sep-5
cliff, but a real defect inside the launch window. Fix regardless — this is the correct query shape.

## Change — split into two queries; do NOT just add a `.gte()`
`avgPerDayFromCutoffs` uses `snapshots[0]` as the SEASON anchor (`cutoff-window.ts:31-33`).
Windowing the array alone silently converts the season average into an 8-day average.

- `getRecentCutoffSnapshots()` — `.gte("captured_at", now - 8d).order(asc).limit(1200)`
- `getSeasonAnchorCutoff()` — `.order(asc).limit(1).maybeSingle()`
- `avgPerDayFromCutoffs(snapshots, live, anchor)` — new third param; use `anchor ?? snapshots[0]`
- `liveWzHistoryFor` issues both via `Promise.all`

## Acceptance criteria
- [ ] No unbounded snapshot query remains in `src/lib/data/`
- [ ] `avgPerDaySeason` on prod is unchanged before/after deploy
- [ ] Window with no row older than 24h yields `change24h: null`, not a wrong number
- [ ] New cases in `src/lib/data/live-history.test.ts` (already in `npm test`); `npm test` green
- [ ] Prod home 24h delta matches the LAUNCH-QA "Commands to re-run" SQL

## Files
- `src/lib/data/live-history.ts`, `src/lib/data/cutoff-window.ts`, `src/lib/data/live-history.test.ts`

Phase 0 (by Sep 3, or Sep 4 if OPS-08 shows no 1000-row cap). Freeze-legal: yes, defect fix.'
```
</details>

<details>
<summary><strong>WZ-12 — never render seed data as live</strong> (Phase 0)</summary>

```bash
gh issue create --title "[WZ-12] Never render generated seed players or a seed cutoff as live data" \
  --label p0,workstream:wz,launch,bug --milestone "Launch Sep 7" --body '
## Context
When `getLiveWzBoard()` returns null, `tracker-page.tsx:58` falls back to `board.rows` — the
synthetic roster from `src/lib/data/generate.ts`. Executed directly, that path yields:

```
seed cutoff: 20155   (real: 23,796 — 15% wrong)
seed rows:   1 Nzr ttv50 36287 / 2 Klyra 0170 34351 / 3 Ryn tv57 29919
```

`src/app/page.tsx:27-32` does the same for the hero numeral. `lastGood` in
`src/lib/data/codmunity.ts:19` is a module-level variable, empty on every Netlify cold start — this
is the default cold-instance behavior during a CODMunity outage, not a rare edge. QA §5 step 10
("force-fail live API -> graceful, PASS") most likely observed exactly this.

## Change
Add `src/lib/data/board-source.ts` resolving live -> latest stored snapshot -> none. Then:
1. **Never render `db()` rows for the active WZ season.** `isLiveWzBoard()` exists
   (`src/lib/data/queries.ts:155`). Archived seasons (`/wz/s/s4`) keep seed rows, unchanged.
2. **Never render a seed cutoff as current.** Every `live && seedMetrics ? overlay(…) : seedMetrics`
   becomes `… : storedMetrics ?? null`; `source === "none"` renders the existing empty state.
3. Copy when `source === "stored"`: "Live standings unavailable. Showing the last recorded cutoff
   from {relative time}." Reuse `snapshot-time-chip.tsx`.

## Acceptance criteria
- [ ] With `api.codmunity.gg` blocked, `/` and `/wz` show ~23,7xx from the stored snapshot
- [ ] Zero occurrences of `Nzr` / `Klyra` / `Ryn` / `Sable` in the DOM on `/` or `/wz`
- [ ] Archived `/wz/s/s4` behavior unchanged
- [ ] New `src/lib/data/board-source.test.ts` added to the `test` script in `package.json`; `npm test` green

## Files
`src/lib/data/board-source.ts` (new), `src/lib/data/live-history.ts`,
`src/components/tracker-page.tsx:38-58,66,103`, `src/app/page.tsx:24-35`,
`src/app/history/page.tsx:25-34`, `src/app/friends/page.tsx:25-34`,
`src/app/players/[slug]/page.tsx:62-71`, `src/app/settings/layout.tsx:36-45`,
`src/components/calc-page.tsx:21-31`

## Reduced scope if not merged by Sep 4 EOD
Rule 1 only (~5 lines in `tracker-page.tsx`, no new file, no copy): live-fetch failure shows the
existing empty state instead of 250 invented players. Ugly but honest, defensible inside the freeze.

Phase 0 (by Sep 4 EOD). Depends on WZ-11 (shared file). Freeze-legal: yes as a defect fix; land it
before the freeze.'
```
</details>

<details>
<summary><strong>OPS-13 — scope-freeze declaration</strong> (Phase 0)</summary>

```bash
gh issue create --title "[OPS-13] Declare feature freeze effective Sep 4; no new surface before launch" \
  --label p1,workstream:ops,launch --milestone "Launch Sep 7" --body '
## Context
Two unplanned workstreams landed in the final week, absent from the QA matrix:
- Friend requests + Friends SR leaderboard (`a15e317`, Aug 29) — two migrations, not in LAUNCH_ROADMAP §2
- N-02 Discord webhook (PR #32, merged Sep 1) — listed **Post** in §2D, named under §1 "Explicitly
  out of Sep 7 scope"

Neither violated the freeze rule (freeze starts Sep 5). Both expanded untested surface at T-7.

## Decision requested
- [ ] Feature freeze declared effective **Sep 4 EOD**, one day ahead of the roadmap freeze
- [ ] After Sep 4, only `bug`-labeled work merges; anything else needs an explicit exception in
      `docs/LAUNCH_ROADMAP.md` §8 decision log
- [ ] Confirm friends + `/history` + settings tabs are in scope for the OPS-09 QA re-run

Phase 0 (Sep 2). Decision, not code.'
```
</details>

<details>
<summary><strong>OPS-09 — Sep 5–7 QA re-verification</strong> (Phase 1)</summary>

```bash
gh issue create --title "[OPS-09] Sep 5-7 QA re-verification: full §5 script + surfaces changed after Aug 30 sign-off" \
  --label p0,workstream:ops,launch --milestone "Launch Sep 7" --body '
## Context
The 2026-08-30 sign-off in `docs/LAUNCH-QA-2026-08-29.md` §5 predates three merges:
- `53d5518` (Aug 31) deleted `settings-content.tsx`, rewrote Settings into tabbed sub-pages (+835/-315)
- `d7c4e29` (Aug 31) added history filters; `linked-accounts.tsx` +521/-157
- `2de498e` (Aug 31) reworked History header stats

QA §5 item 9 ("Settings save notify toggles") was verified against a UI that no longer exists.
Friends and `/history` were never in the QA matrix.

Automated smoke scripts are NOT behavioral — `scripts/wz-03-climb-sync-smoke.sh:33-46` asserts the
string `Retry sync` exists in a file. Treat them as lint. This issue is the actual verification.

## Prerequisites
WZ-11 and WZ-12 deployed to prod first.

## Desktop browser (Sep 5)
- [ ] QA §5 steps 1-10 re-run against production
- [ ] Settings: all four sub-pages save and persist
- [ ] `/history` filters; header stats agree with the filtered list
- [ ] `/friends`: send, accept, leaderboard renders
- [ ] Waitlist dedupe: new email -> "on the list"; resubmit -> "already on the list"
- [ ] Block `api.codmunity.gg`: real stored cutoff + stale notice, zero synthetic gamertags (verifies WZ-12)

## Real phone (Sep 6) — closes #7
- [ ] `/`, `/wz`, `/wz/calc`, `/players/[slug]` on a physical device
- [ ] Board table scroll/readability (desktop uses `lg:fixed lg:inset-0`; verify mobile unaffected)
- [ ] Climb session FAB + share card; safe-area insets at the bottom

## Auth + gate (Sep 6) — reconfirms #17
- [ ] Cold Discord OAuth in a clean profile -> session, no `/?code=`
- [ ] Cross-device magic link (send desktop, open phone)
- [ ] Orphan-account onboarding wizard (WZ-02 criterion 6 never executed)
- [ ] `/mp`, `/mp/calc`, `/mp/s/[season]` all still "coming soon"; ModePick + onboarding MP disabled

## Rules
File findings as `bug`-labeled issues only. Record results in a NEW `docs/LAUNCH-QA-2026-09-05.md`.

Phase 1 (Sep 5-6). Human only, no code.'
```
</details>

<details>
<summary><strong>OPS-10 — launch-day runbook</strong> (Phase 2)</summary>

```bash
gh issue create --title "[OPS-10] Launch-day runbook: pre-announce and post-announce monitoring sweep" \
  --label p1,workstream:ops,launch --milestone "Launch Sep 7" --body '
## Morning of Sep 7, before announce
- [ ] Netlify Functions/SSR logs, last 12h: grep `[ops]`, 5xx bursts
- [ ] Supabase Edge logs for `poll-wz-cutoff`: `fresh` skips healthy; `short_payload` = warn;
      401/502/insert errors = page
- [ ] Snapshot freshness SQL (OPS-04): newest `captured_at` within 20 minutes
- [ ] Home renders a live cutoff matching the newest snapshot; 24h delta present
- [ ] `/mp` still coming soon
- [ ] Tag `v1.0-wz` / pin the Netlify production deploy

## After announce
- [ ] Same two consoles once more; Supabase Advisors if Auth/Postgres looks noisy
- [ ] Watch `desktop_waitlist` row count for spam (insert is anon and unthrottled — DESK-08)

## Community expectation
`MIN_CUTOFF_DELTA` compares CONSECUTIVE 15-minute snapshots (default 50, prod currently 27).
Observed deltas 0-45, so the Discord webhook fires rarely — working as built. See the Phase 3
tuning note if daily-move alerts are the goal.

Reference: `docs/OPS-06-error-monitoring.md`.

Phase 2 (Sep 7).'
```
</details>

<details>
<summary><strong>WZ-13 / WZ-14 / OPS-11 / OPS-12 / DESK-08 / WZ-15</strong> (Phase 3 — Post)</summary>

```bash
gh issue create --title "[WZ-13] Enforce profile privacy in RLS, not just the app layer" \
  --label p1,workstream:wz,post --body '
Confirmed live: anon REST with the publishable key returns all 9 profile rows including any
`is_private = true` (`slug`, `display_name`, `current_sr`, `climb_goals`, `notify_*`; no emails —
those are in `auth.users`). Privacy is enforced only at `src/app/players/[slug]/page.tsx:53-56`.
Blast radius today is zero (0 private profiles); nonzero the first day a user toggles the setting.

## Change
New migration under `supabase/migrations/` (never dashboard-only — history drift repaired once,
LAUNCH-QA §3). Replace the blanket SELECT policy with
`is_private = false OR id = auth.uid() OR <friend of auth.uid()>`.

## Acceptance criteria
- [ ] Anon REST on a private profile returns no row
- [ ] Owner + accepted friends still resolve the profile
- [ ] `src/lib/profile/queries.ts`, `search.ts`, `friends/*` audited for reads assuming open SELECT
- [ ] pgTAP coverage in `supabase/tests/profiles_rls.test.sql`

Phase 3 / Post. NOT freeze-legal — an RLS change next to launch is how you take the site down.'

gh issue create --title "[WZ-14] Add metadataBase + OpenGraph/Twitter cards for the launch announce" \
  --label p1,workstream:wz,post --body '
`src/app/layout.tsx:17-24` has no `metadataBase` and no `openGraph` block — the launch post previews
as bare text. Description also still reads "Ranked Multiplayer" while MP is gated.

## Change
- `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://elovatesr.netlify.app")`
- `openGraph` + `twitter: { card: "summary_large_image" }`
- `app/opengraph-image.tsx` or a static asset (`public/share/` has brand art)
- Reword the description Warzone-first

## Acceptance criteria
- [ ] Discord + X debuggers render a card with image for `/`, `/wz`, `/desktop`
- [ ] Description makes no live-MP claim

Phase 3 / Post. May land Sep 4 if WZ-12 is already green (one file). After Sep 5 needs a freeze
exception (polish, not a defect).'

gh issue create --title "[OPS-11] Alert when poll-wz-cutoff stops inserting snapshots" \
  --label p1,workstream:ops,post --body '
OPS-06 is a runbook, not a monitor. A cron that dies at 02:00 is discovered whenever someone next
opens the Supabase console; the home 24h delta and sparkline degrade silently.

## Change
pg_cron job (hourly) checking `max(captured_at)` on `snapshots` for the active WZ season; if older
than 45 minutes, POST to the same `DISCORD_CUTOFF_WEBHOOK_URL` N-02 uses. Schedule SQL alongside
`supabase/cron/schedule_poll_wz_cutoff.sql`.

## Acceptance criteria
- [ ] Alert fires within an hour of ingest stopping
- [ ] Does not fire during normal `{"skipped":true,"reason":"fresh"}` operation
- [ ] Runbook row added to `docs/OPS-06-error-monitoring.md`

Phase 3 / Post.'

gh issue create --title "[OPS-12] Run the poll-wz-cutoff Deno tests in CI" \
  --label p2,workstream:ops,post --body '
`supabase/functions/poll-wz-cutoff/discord.test.ts` (added in PR #32) is never executed by
`npm test` — that script is an explicit list of `node --import tsx` files and Deno is not a dev
dependency. The N-02 embed builder and threshold logic have zero automated CI coverage.

## Change
Add a `test:functions` script running `deno test supabase/functions/poll-wz-cutoff/`, document it in
README, reference it from `docs/AGENT_PIPELINE.md` so reviewer agents run it on function changes.

## Acceptance criteria
- [ ] `npm run test:functions` passes locally
- [ ] Any future `poll-wz-cutoff` change requires it (documented in the agent pipeline guardrails)

Phase 3 / Post.'

gh issue create --title "[DESK-08] Throttle anonymous desktop_waitlist inserts" \
  --label p1,workstream:desktop,post --body '
`supabase/migrations/20260827213830_create_desktop_waitlist.sql` grants `insert` to `anon` with no
rate limit and no captcha. On launch day a bored community member can insert thousands of rows.
Contained (table is insert-only, no public select) but it pollutes the DESK-06 export.

## Change
Mirror the per-IP limiter in `src/lib/ocr/rate-limit.ts` in front of `joinDesktopWaitlist`
(`src/lib/desktop/waitlist.ts`), or add a Postgres per-IP policy.

## Acceptance criteria
- [ ] Repeated submissions from one IP are rejected above a sane threshold
- [ ] Legitimate single submissions and the existing dedupe UX are unaffected

Phase 3 / Post. Accepted knowingly for launch.'

gh issue create --title "[WZ-15] Retire generate.ts seed data across archived seasons" \
  --label p2,workstream:wz,post --body '
WZ-12 stops seed data reaching the live WZ board, but `src/lib/data/generate.ts` still backs
archived seasons (`/wz/s/s4`) and every `getBoardMetrics` call site — 280 invented players with a
deterministic RNG. Root cause of the class of bug WZ-12 patches; re-emerges the next time someone
adds a surface that reads `db()`.

## Change
Back archived seasons with real stored `snapshots` history, or label archived boards explicitly as
sample data. Delete `generate.ts` when nothing imports it.

## Related (no separate issue)
`src/lib/data/codmunity.ts:115` `unstable_cache` -> Next 16 `use cache` directive. Still functional;
migrate when Cache Components are adopted.

Phase 3 / Post.'
```
</details>

---

## 4. Freeze-legality summary

| Item | Call |
|---|---|
| OPS-07, WZ-11, WZ-12 | **Freeze-legal** as defect fixes; scheduled Sep 2–4 regardless. If WZ-12 slips, the reduced-scope variant is what lands during the freeze — not the full version. |
| OPS-08, OPS-09, OPS-10 | **Freeze-legal**, no code. OPS-09 *is* the freeze activity. |
| OPS-13 scope-freeze | Decision, Sep 2. Recommends pulling the effective freeze forward to Sep 4. |
| WZ-14 (OG metadata) | **Exception required** if attempted after Sep 5. Land Sep 4 or defer to Post. |
| WZ-13, OPS-11, OPS-12, DESK-08, WZ-15 | **Post.** WZ-13 must not be touched before Sep 7. |
| Bugs found during OPS-09 | Freeze-legal only if labeled `bug`. |

**Agent routing note:** WZ-11 and WZ-12 both edit `src/lib/data/live-history.ts` → run them
sequentially in one developer-agent loop, not in parallel. OPS-07 is fully independent.
