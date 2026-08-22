ALTER TABLE public.email_deferred_sends
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS failure_kind text NOT NULL DEFAULT 'transient',
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS email_deferred_sends_due_idx
  ON public.email_deferred_sends (next_attempt_at)
  WHERE delivered_at IS NULL;

SELECT cron.schedule(
  'email-deferred-retry',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--5351efc5-c55a-4e41-b282-a4a019690d38-dev.lovable.app/api/public/hooks/email-flush',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);