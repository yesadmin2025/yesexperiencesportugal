CREATE TABLE public.guide_tour_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (length(btrim(note)) between 1 and 4000),
  expense_amount numeric(10,2) CHECK (expense_amount IS NULL OR expense_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guide_tour_notes_booking_idx ON public.guide_tour_notes(booking_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_tour_notes TO authenticated;
GRANT ALL ON public.guide_tour_notes TO service_role;
ALTER TABLE public.guide_tour_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage guide notes" ON public.guide_tour_notes FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide reads own notes" ON public.guide_tour_notes FOR SELECT TO authenticated USING (guide_id = public.current_guide_id());
CREATE POLICY "Guide writes notes on own tours" ON public.guide_tour_notes FOR INSERT TO authenticated WITH CHECK (
  guide_id = public.current_guide_id() AND EXISTS (SELECT 1 FROM public.tour_assignments a WHERE a.booking_id = guide_tour_notes.booking_id AND a.guide_id = public.current_guide_id() AND a.removed_at IS NULL));
CREATE POLICY "Guide edits own notes" ON public.guide_tour_notes FOR UPDATE TO authenticated USING (guide_id = public.current_guide_id()) WITH CHECK (guide_id = public.current_guide_id());
CREATE POLICY "Guide deletes own notes" ON public.guide_tour_notes FOR DELETE TO authenticated USING (guide_id = public.current_guide_id());
CREATE OR REPLACE FUNCTION public.guide_tour_notes_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER guide_tour_notes_touch BEFORE UPDATE ON public.guide_tour_notes FOR EACH ROW EXECUTE FUNCTION public.guide_tour_notes_touch();