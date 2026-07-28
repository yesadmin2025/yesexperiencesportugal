CREATE TABLE public.booking_snapshots (
  stripe_session_id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  frozen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_snapshots TO authenticated;
GRANT ALL ON public.booking_snapshots TO service_role;

ALTER TABLE public.booking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read booking snapshots"
ON public.booking_snapshots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_booking_snapshots_updated_at
BEFORE UPDATE ON public.booking_snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();