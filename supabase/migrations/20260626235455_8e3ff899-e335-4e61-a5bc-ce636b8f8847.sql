
CREATE TABLE public.lead_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254 AND position('@' in email) > 1),
  lead_magnet TEXT NOT NULL DEFAULT 'lisbon-day-trips-map',
  consent BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  locale TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lead_captures_email_idx ON public.lead_captures (lower(email));
CREATE INDEX lead_captures_created_at_idx ON public.lead_captures (created_at DESC);

GRANT INSERT ON public.lead_captures TO anon, authenticated;
GRANT SELECT ON public.lead_captures TO authenticated;
GRANT ALL ON public.lead_captures TO service_role;

ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) may submit a lead, but only with consent=true.
CREATE POLICY "Anyone can submit a lead with consent"
  ON public.lead_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (consent = true);

-- Only admins can read leads.
CREATE POLICY "Admins can read leads"
  ON public.lead_captures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete leads (e.g., GDPR erasure requests).
CREATE POLICY "Admins can delete leads"
  ON public.lead_captures
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
