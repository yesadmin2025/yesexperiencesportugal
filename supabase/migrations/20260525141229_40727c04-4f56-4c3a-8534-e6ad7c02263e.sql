
CREATE TABLE public.studio_ab_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id text NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  user_agent text,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_ab_assignments_exp ON public.studio_ab_assignments(experiment_key, anonymous_id);

ALTER TABLE public.studio_ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert studio ab assignment"
ON public.studio_ab_assignments
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(anonymous_id) BETWEEN 8 AND 64
  AND length(experiment_key) BETWEEN 1 AND 64
  AND length(variant) BETWEEN 1 AND 32
);

CREATE POLICY "Admins can read studio_ab_assignments"
ON public.studio_ab_assignments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update studio_ab_assignments"
ON public.studio_ab_assignments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete studio_ab_assignments"
ON public.studio_ab_assignments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.studio_ab_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id text NOT NULL,
  experiment_key text NOT NULL,
  variant text NOT NULL,
  event text NOT NULL,
  scene_id text,
  route text,
  meta jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_ab_events_exp ON public.studio_ab_events(experiment_key, variant, event);

ALTER TABLE public.studio_ab_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert studio ab event"
ON public.studio_ab_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(anonymous_id) BETWEEN 8 AND 64
  AND length(experiment_key) BETWEEN 1 AND 64
  AND length(variant) BETWEEN 1 AND 32
  AND event = ANY (ARRAY['exposure','drawer_open','reco_add','fast_mode_on','cta_book','cta_save','reveal_shown'])
);

CREATE POLICY "Admins can read studio_ab_events"
ON public.studio_ab_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update studio_ab_events"
ON public.studio_ab_events FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete studio_ab_events"
ON public.studio_ab_events FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
