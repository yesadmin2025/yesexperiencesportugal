
CREATE TABLE public.tour_bokun_mapping (
  tour_id TEXT PRIMARY KEY,
  bokun_product_id TEXT NOT NULL,
  bokun_title TEXT,
  bokun_product_code TEXT,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_bokun_mapping TO authenticated;
GRANT ALL ON public.tour_bokun_mapping TO service_role;

ALTER TABLE public.tour_bokun_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bokun mapping"
  ON public.tour_bokun_mapping FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bokun mapping"
  ON public.tour_bokun_mapping FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bokun mapping"
  ON public.tour_bokun_mapping FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bokun mapping"
  ON public.tour_bokun_mapping FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_tour_bokun_mapping_updated_at
  BEFORE UPDATE ON public.tour_bokun_mapping
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
