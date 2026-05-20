
CREATE TABLE public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL,
  stack text,
  source text,
  url text,
  user_agent text,
  viewport_width integer,
  viewport_height integer,
  route text,
  session_id text,
  severity text NOT NULL DEFAULT 'error',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX client_error_logs_created_at_idx ON public.client_error_logs (created_at DESC);
CREATE INDEX client_error_logs_severity_idx ON public.client_error_logs (severity);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert client error logs"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(message) BETWEEN 1 AND 4000
    AND (stack IS NULL OR length(stack) <= 8000)
    AND (source IS NULL OR length(source) <= 500)
    AND (url IS NULL OR length(url) <= 1000)
    AND (user_agent IS NULL OR length(user_agent) <= 500)
    AND (route IS NULL OR length(route) <= 500)
    AND (session_id IS NULL OR length(session_id) <= 64)
    AND severity IN ('error','warning','info','unhandled_rejection','resource')
  );

CREATE POLICY "Admins can read client error logs"
  ON public.client_error_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete client error logs"
  ON public.client_error_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
