CREATE TABLE IF NOT EXISTS public.viator_drift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tours_checked INT NOT NULL DEFAULT 0,
  tours_with_drift INT NOT NULL DEFAULT 0,
  scrape_errors INT NOT NULL DEFAULT 0,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS viator_drift_reports_run_at_idx ON public.viator_drift_reports (run_at DESC);
GRANT SELECT ON public.viator_drift_reports TO authenticated;
GRANT ALL    ON public.viator_drift_reports TO service_role;
ALTER TABLE public.viator_drift_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read viator_drift_reports" ON public.viator_drift_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));