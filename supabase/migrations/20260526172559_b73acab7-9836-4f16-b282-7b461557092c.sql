CREATE TABLE public.studio_v2_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_token TEXT NOT NULL UNIQUE,
  profile JSONB NOT NULL,
  region TEXT,
  archetype TEXT,
  stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  total_drive_minutes INTEGER NOT NULL DEFAULT 0,
  total_km INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  preferred_date DATE,
  guests INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_v2_bookings_draft_token ON public.studio_v2_bookings(draft_token);
CREATE INDEX idx_studio_v2_bookings_status ON public.studio_v2_bookings(status);

GRANT ALL ON public.studio_v2_bookings TO service_role;

ALTER TABLE public.studio_v2_bookings ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: all access goes through server fns using the service_role client,
-- which scopes reads by draft_token (an unguessable secret), matching the pattern in studio_v2_sessions.

CREATE TRIGGER trg_studio_v2_bookings_updated_at
BEFORE UPDATE ON public.studio_v2_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();