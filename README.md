This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## SR screenshot OCR (optional)

Photo upload on the WZ climb calculator calls Google Cloud Vision. Set one of:

- `GOOGLE_CLOUD_CREDENTIALS` — full service account JSON string (preferred for hosting)
- `GOOGLE_APPLICATION_CREDENTIALS` — filesystem path to a service account JSON file (local)

Enable the Vision API on the GCP project. Do not commit credential files.

## Cutoff snapshots (Supabase)

Live Warzone cutoff history is stored in Supabase. The home 24h gain uses that table only — never generated seed snapshots. Until about 24 hours of rows exist, the 24h sparkline stays hidden.

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (Dashboard → Project Settings → API; ingest only, never `NEXT_PUBLIC_`)
- `CRON_SECRET` (shared with the `poll-wz-cutoff` Edge Function)

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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
