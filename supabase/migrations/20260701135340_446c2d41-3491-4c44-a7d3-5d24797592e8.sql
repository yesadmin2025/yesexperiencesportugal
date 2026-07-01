
CREATE TABLE public.stripe_webhook_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('ok','fail')),
  reason text,
  valid_status int,
  invalid_status int,
  secret_present boolean NOT NULL DEFAULT false,
  secret_prefix_ok boolean NOT NULL DEFAULT false,
  endpoint text,
  alerted boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stripe_webhook_health_checks TO authenticated;
GRANT ALL ON public.stripe_webhook_health_checks TO service_role;

ALTER TABLE public.stripe_webhook_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read health checks"
ON public.stripe_webhook_health_checks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX stripe_webhook_health_checks_checked_at_idx
ON public.stripe_webhook_health_checks (checked_at DESC);
