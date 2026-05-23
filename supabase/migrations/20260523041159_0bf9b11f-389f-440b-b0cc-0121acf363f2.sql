
CREATE TABLE public.drift_behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  chapter_id text,
  signal_type text NOT NULL,
  decision_latency_ms integer,
  linger_ms integer,
  attraction_target text,
  predicted_archetype text,
  predicted_tonal_register text,
  predicted_intensity text,
  reveal_confidence numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drift_behavior_events_session ON public.drift_behavior_events(session_id);
CREATE INDEX idx_drift_behavior_events_occurred ON public.drift_behavior_events(occurred_at DESC);

ALTER TABLE public.drift_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read drift_behavior_events"
ON public.drift_behavior_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete drift_behavior_events"
ON public.drift_behavior_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert drift_behavior_events"
ON public.drift_behavior_events FOR INSERT TO anon, authenticated
WITH CHECK (
  length(session_id) BETWEEN 8 AND 64
  AND length(signal_type) BETWEEN 1 AND 48
  AND signal_type = ANY (ARRAY['decision','linger','skip','attraction','prediction_update'])
  AND (chapter_id IS NULL OR length(chapter_id) <= 64)
  AND (attraction_target IS NULL OR length(attraction_target) <= 96)
  AND (predicted_archetype IS NULL OR length(predicted_archetype) <= 32)
  AND (predicted_tonal_register IS NULL OR length(predicted_tonal_register) <= 32)
  AND (predicted_intensity IS NULL OR length(predicted_intensity) <= 32)
);
