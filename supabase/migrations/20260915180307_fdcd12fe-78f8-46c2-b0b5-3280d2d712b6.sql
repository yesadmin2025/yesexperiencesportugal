ALTER TABLE public.client_error_logs
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS query jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS client_error_logs_category_created_at_idx
  ON public.client_error_logs (category, created_at DESC);