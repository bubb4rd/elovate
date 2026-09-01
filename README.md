# elovate

Warzone SR tracker — live Top 250 board, climb sessions, player profiles, and friends.

**Live:** https://elovatesr.netlify.app  
**Launch plan:** `docs/LAUNCH_ROADMAP.md`

## Getting started

```bash
cp .env.example .env.local   # fill in Supabase + cron keys
npm install
npm run dev
```

Open http://localhost:3000.

## SR screenshot OCR (optional)

Photo upload on the WZ climb calculator calls Google Cloud Vision. Set one of:

- `GOOGLE_CLOUD_CREDENTIALS` — full service account JSON string (preferred for hosting)
- `GOOGLE_APPLICATION_CREDENTIALS` — filesystem path to a service account JSON file (local)

Enable the Vision API on the GCP project. Do not commit credential files.

See `docs/WZ-07-ocr-optional.md` for operator setup and launch-without-keys checklist. Smoke: `./scripts/wz-07-ocr-smoke.sh`.

## Cutoff snapshots (Supabase)

Live Warzone cutoff history is stored in Supabase. The home 24h gain uses that table only — never generated seed snapshots. Until about 24 hours of rows exist, the 24h sparkline stays hidden.

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (Dashboard → Project Settings → API; ingest only, never `NEXT_PUBLIC_`)
- `CRON_SECRET` (shared with the `poll-wz-cutoff` Edge Function)

Optional Edge Function secrets for the community Discord post (see below):

- `DISCORD_CUTOFF_WEBHOOK_URL` — channel webhook. Unset → Discord is skipped, ingest is unchanged. Never commit this.
- `MIN_CUTOFF_DELTA` — minimum `|cutoff delta|` in SR to post (default `50`). Suppresses 15-minute noise; parsed with `Number()`, falls back to `50` if missing or invalid.

Local:

```bash
supabase start
supabase test db
set -a && source .env.local && set +a
supabase functions serve poll-wz-cutoff
curl -i -X POST 'http://127.0.0.1:54321/functions/v1/poll-wz-cutoff' \
  --header "x-cron-secret: $CRON_SECRET"
```

Hosted (project `ioagctykwkspbwzyrfcb`):

```bash
supabase link --project-ref ioagctykwkspbwzyrfcb
supabase db push
supabase secrets set CRON_SECRET="$CRON_SECRET"
supabase functions deploy poll-wz-cutoff --use-api
```

Then in the SQL editor, store the same cron secret in Vault and schedule the job:

```sql
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

```bash
# after the vault secret exists
supabase db query --linked -f supabase/cron/schedule_poll_wz_cutoff.sql
```

The job POSTs every 15 minutes. 24h stays empty until a snapshot is at least 24 hours older than the latest live fetch.

### Community Discord post on cutoff move (N-02)

When `poll-wz-cutoff` inserts a new snapshot and the cutoff moved at least `MIN_CUTOFF_DELTA`
SR versus the previous snapshot, it posts an embed (cutoff SR, change, rank #1, link) to a
Discord channel webhook. The post is fire-and-forget: a down or misconfigured webhook is
logged as `[poll-wz-cutoff] discord webhook failed` and never fails ingest or the HTTP
response. Fresh-skips, CODMunity failures, and insert failures never post.

```bash
# Discord: Server → Channel → Integrations → Webhooks → New Webhook → Copy URL
supabase secrets set DISCORD_CUTOFF_WEBHOOK_URL="https://discord.com/api/webhooks/..."
supabase secrets set MIN_CUTOFF_DELTA=50   # optional, default 50
supabase functions deploy poll-wz-cutoff --use-api
```

The webhook URL is a secret — keep it in Supabase secrets, never in the repo.

Embed-builder and threshold-gate unit tests: `cd supabase/functions/poll-wz-cutoff && deno task test`.

## Error monitoring (ops)

Uncaught UI crashes and server `console.error` lines land in **Netlify Function / SSR logs**. Cutoff ingest and database issues land in **Supabase** Edge Function + Postgres/Auth logs. Grep prefixes: `[ops]`, `[ocr]`, `[friends]`, `[match-invites]`.

See `docs/OPS-06-error-monitoring.md` for dashboard links, expected-vs-incident, and Sep 7 check cadence.

## Auth / profiles

Push profile migrations to hosted with `supabase db push` (includes onboarding columns on `profiles`). Existing auth users without a profile row are sent to `/onboarding` on sign-in; the wizard inserts their row. For bulk backfill of legacy orphans, run `supabase/scripts/backfill_orphan_profiles.sql` in the SQL editor. Smoke: `./scripts/wz-02-onboarding-smoke.sh` (see `docs/WZ-02-onboarding-smoke-results.md`). Profile privacy/themes/reputation: `./scripts/wz-06-profile-smoke.sh` (see `docs/WZ-06-profile-smoke-results.md`).

### Hosted Auth URL configuration (required for Discord / OAuth)

In the [elovate Auth URL Configuration](https://supabase.com/dashboard/project/ioagctykwkspbwzyrfcb/auth/url-configuration):

- **Site URL:** `https://elovatesr.netlify.app`
- **Redirect URLs** (add all that apply; match `supabase/config.toml`):
  - `https://elovatesr.netlify.app`
  - `https://elovatesr.netlify.app/auth/callback`
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/auth/callback`
  - `http://localhost:3000`
  - `http://localhost:3000/auth/callback`

If `/auth/callback` is missing from Redirect URLs, Supabase falls back to Site URL and you land on `/?code=…` with no session.

### Magic-link email templates (required for cross-device sign-in)

With `@supabase/ssr` PKCE, default `{{ .ConfirmationURL }}` links only work on the **same browser** that requested the email (code verifier is local). Hosted Auth templates must use `TokenHash` (and preferably include `{{ .Token }}` for manual code entry) so opening the link on another phone/computer works:

```html
<p>{{ .Token }}</p>
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Sign in</a>
```

Also set `NEXT_PUBLIC_SITE_URL` to the primary site origin so auth redirects do not use Netlify deploy subdomains.

Local copy: `supabase/templates/magic_link.html` (also used for confirmation in `config.toml`). Hosted templates are edited in Dashboard → Auth → Email Templates (or Management API); `config.toml` does not auto-deploy them.

Discord Developer Portal redirect for this project must be:

`https://ioagctykwkspbwzyrfcb.supabase.co/auth/v1/callback`
