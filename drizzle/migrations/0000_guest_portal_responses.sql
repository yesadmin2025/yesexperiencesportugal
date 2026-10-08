CREATE TABLE public.guest_portal_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  attendance_confirmed_at timestamptz,
  pickup_update text,
  guest_names text[] NOT NULL DEFAULT '{}',
  guest_note text,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guest_portal_responses TO authenticated;
GRANT ALL ON public.guest_portal_responses TO service_role;
ALTER TABLE public.guest_portal_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read guest portal responses" ON public.guest_portal_responses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));