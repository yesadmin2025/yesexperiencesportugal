CREATE TABLE public.stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id TEXT,
  event_type TEXT,
  stripe_env TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  status_code INTEGER,
  error_message TEXT,
  session_id TEXT,
  payment_status TEXT,
  amount_total INTEGER,
  currency TEXT,
  customer_email TEXT,
  booking_type TEXT,
  metadata JSONB
);
CREATE INDEX idx_stripe_webhook_events_received_at ON public.stripe_webhook_events (received_at DESC);
GRANT ALL ON public.stripe_webhook_events TO service_role;
GRANT SELECT ON public.stripe_webhook_events TO authenticated;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages webhook events"
  ON public.stripe_webhook_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);