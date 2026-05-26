CREATE TABLE public.studio_v2_predictions (
  session_id text PRIMARY KEY,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  mood_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  pace_confidence numeric NOT NULL DEFAULT 0.5,
  signal_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.studio_v2_predictions TO service_role;

ALTER TABLE public.studio_v2_predictions ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — only server admin code touches this table.

CREATE TRIGGER studio_v2_predictions_updated_at
BEFORE UPDATE ON public.studio_v2_predictions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();