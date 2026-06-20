CREATE TABLE public.studio_v3_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  step_number int NOT NULL,
  step_key text NOT NULL,
  event text NOT NULL,
  value jsonb,
  variant text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.studio_v3_funnel_events TO anon, authenticated;
GRANT ALL ON public.studio_v3_funnel_events TO service_role;

ALTER TABLE public.studio_v3_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert funnel events"
  ON public.studio_v3_funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(session_id) BETWEEN 6 AND 128
    AND step_number BETWEEN 0 AND 50
    AND length(step_key) BETWEEN 1 AND 64
    AND length(event) BETWEEN 1 AND 64
  );

CREATE POLICY "admins read funnel events"
  ON public.studio_v3_funnel_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_studio_v3_funnel_session
  ON public.studio_v3_funnel_events (session_id, created_at);

CREATE INDEX idx_studio_v3_funnel_step
  ON public.studio_v3_funnel_events (step_key, event, created_at DESC);