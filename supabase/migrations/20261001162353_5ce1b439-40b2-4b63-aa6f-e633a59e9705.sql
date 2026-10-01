SELECT cron.schedule(
  'tour-day-before-email',
  '0 16 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://yesexperiencesportugal.com/api/public/hooks/tour-day-before',
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