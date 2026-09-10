CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tour_id TEXT,
  preferred_date DATE,
  adults INTEGER NOT NULL DEFAULT 2,
  children INTEGER NOT NULL DEFAULT 0,
  preferences TEXT,
  source TEXT,
  attribution JSONB,
  status TEXT NOT NULL DEFAULT 'new'
);
GRANT INSERT ON public.booking_requests TO anon;
GRANT INSERT ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a booking request" ON public.booking_requests FOR INSERT TO anon, authenticated WITH CHECK (true);