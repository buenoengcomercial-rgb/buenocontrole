-- Reduce email queue polling from every 5 seconds to once per minute while
-- preserving the command and credentials already configured in the live job.
DO $$
DECLARE
  current_command text;
BEGIN
  SELECT command
    INTO current_command
    FROM cron.job
   WHERE jobname = 'process-email-queue'
   ORDER BY jobid
   LIMIT 1;

  IF current_command IS NULL THEN
    RAISE NOTICE 'Cron job process-email-queue was not found; schedule was not changed.';
  ELSE
    PERFORM cron.schedule(
      'process-email-queue',
      '* * * * *',
      current_command
    );
  END IF;
END;
$$;

-- This table contains only pg_cron execution history, not application data.
TRUNCATE TABLE cron.job_run_details;

-- Keep a short diagnostic window without allowing cron history to grow
-- indefinitely. Re-running this migration updates the existing named job.
SELECT cron.schedule(
  'cleanup-cron-job-run-details',
  '15 3 * * *',
  $cleanup$
    DELETE FROM cron.job_run_details
    WHERE end_time < now() - interval '3 days';
  $cleanup$
);
