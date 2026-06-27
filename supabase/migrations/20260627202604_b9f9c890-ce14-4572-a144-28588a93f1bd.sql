
CREATE TABLE public.dns_watch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  a_records TEXT[] NOT NULL DEFAULT '{}',
  points_to_lovable BOOLEAN NOT NULL DEFAULT false,
  http_status INTEGER,
  http_ok BOOLEAN NOT NULL DEFAULT false,
  ready BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  raw JSONB
);
CREATE INDEX dns_watch_log_checked_at_idx ON public.dns_watch_log (checked_at DESC);
CREATE INDEX dns_watch_log_host_checked_at_idx ON public.dns_watch_log (host, checked_at DESC);

GRANT SELECT ON public.dns_watch_log TO authenticated;
GRANT ALL ON public.dns_watch_log TO service_role;
ALTER TABLE public.dns_watch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dns_watch_log"
  ON public.dns_watch_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dns_watch_state (
  key TEXT NOT NULL PRIMARY KEY,
  all_ready BOOLEAN NOT NULL DEFAULT false,
  ready_since TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ,
  last_summary JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dns_watch_state TO authenticated;
GRANT ALL ON public.dns_watch_state TO service_role;
ALTER TABLE public.dns_watch_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dns_watch_state"
  ON public.dns_watch_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.dns_watch_state (key) VALUES ('default') ON CONFLICT (key) DO NOTHING;
