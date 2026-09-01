# OPS-06 — Error monitoring (Netlify + Supabase logs)

**Workstream:** Ops · **Priority:** P1

Launch does **not** require a third-party APM. Uncaught UI crashes log `[ops]` to Netlify Function/SSR logs. Edge Function and database issues show in the Supabase dashboard.

**Live site:** https://elovatesr.netlify.app  
**Supabase project:** `ioagctykwkspbwzyrfcb`

## Dashboards

| Surface | Where |
|---|---|
| Netlify deploys | [app.netlify.com](https://app.netlify.com) → site for `elovatesr.netlify.app` → **Deploys** |
| Netlify Function / SSR logs | Same site → **Logs** → Functions (filter production) |
| Supabase Edge Functions | [Functions](https://supabase.com/dashboard/project/ioagctykwkspbwzyrfcb/functions) → `poll-wz-cutoff` → Logs |
| Supabase Postgres / Auth | [Logs](https://supabase.com/dashboard/project/ioagctykwkspbwzyrfcb/logs/explorer) |
| Supabase Advisors | [Advisors](https://supabase.com/dashboard/project/ioagctykwkspbwzyrfcb/advisors) |

## Grep prefixes (Netlify)

| Prefix | Source |
|---|---|
| `[ops]` | Uncaught route / root-layout crashes (`src/lib/ops/report-error.ts`) |
| `[ocr]` | Vision / parse failures in `POST /api/ocr/sr-breakdown` |
| `[friends]` | Friend-request RPC errors |
| `[match-invites]` | Climb invite RPC errors |

## Expected vs incident

| Signal | Treat as |
|---|---|
| OCR **503** `"Scan unavailable right now"` without GCP keys | Expected — see `docs/WZ-07-ocr-optional.md` |
| Climb cloud-sync banner + Retry | Expected — user-visible; local session is kept |
| `poll-wz-cutoff` `{"skipped":true,"reason":"fresh"}` | Healthy — 12-minute ingest throttle |
| `[ops]` in Netlify logs, or 5xx bursts | Page — check the matching deploy and function log |
| `poll-wz-cutoff` 401 / 502 / insert errors | Page — secret mismatch or CODMunity/DB failure |
| `[poll-wz-cutoff] discord webhook failed` in Edge logs | Warn — ingest OK; check `DISCORD_CUTOFF_WEBHOOK_URL` / Discord status |
| `"discordSkipReason":"below_threshold"` in response | Healthy — cutoff moved less than `MIN_CUTOFF_DELTA` |
| `"discordSkipReason":"not_configured"` in response | Healthy — `DISCORD_CUTOFF_WEBHOOK_URL` intentionally unset |
| Missing Discord posts but inserts succeed | Check `DISCORD_CUTOFF_WEBHOOK_URL` secret and `MIN_CUTOFF_DELTA` threshold |

## Launch-day cadence

1. **Morning of Sep 7** — Netlify Functions (last 12h, grep `[ops]` / 5xx) and Supabase Edge Function logs for `poll-wz-cutoff`.
2. **After announce** — same two consoles once more; Advisors if Auth or Postgres looks noisy.

## App recovery UI

Route crashes render `src/app/error.tsx`. Root-layout crashes render `src/app/global-error.tsx`. Both call `reportError` so the digest lands in Netlify logs.
