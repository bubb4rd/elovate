-- Apply on the hosted project after:
--   1. `supabase secrets set CRON_SECRET=<value>` (Edge Function env)
--   2. `select vault.create_secret('<same-value>', 'cron_secret');`
-- Then: `psql` / SQL editor, or `supabase db query -f supabase/cron/schedule_poll_wz_cutoff.sql --linked`

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'poll-wz-cutoff';

select
  cron.schedule(
    'poll-wz-cutoff',
    '*/15 * * * *',
    $$
    select
      net.http_post(
        url := 'https://ioagctykwkspbwzyrfcb.supabase.co/functions/v1/poll-wz-cutoff',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'cron_secret'
          )
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
