-- Per-tour price tiers (guests 1..8 → EUR per pax)
CREATE TABLE public.tour_price_tiers (
  tour_id text PRIMARY KEY,
  tiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.tour_price_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_price_tiers TO authenticated;
GRANT ALL ON public.tour_price_tiers TO service_role;

ALTER TABLE public.tour_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tour price tiers"
  ON public.tour_price_tiers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tour price tiers"
  ON public.tour_price_tiers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tour price tiers"
  ON public.tour_price_tiers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tour price tiers"
  ON public.tour_price_tiers FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER set_tour_price_tiers_updated_at
  BEFORE UPDATE ON public.tour_price_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed from current code-defined tiers
INSERT INTO public.tour_price_tiers (tour_id, tiers) VALUES
  ('arrabida-wine-allinclusive', '{"1":279,"2":215,"3":215,"4":189,"5":189,"6":189,"7":159,"8":159}'),
  ('wild-beaches-picnic',        '{"2":159,"3":159,"4":159,"5":159,"6":159,"7":139,"8":139}'),
  ('arrabida-boat',              '{"2":209,"3":209,"4":199,"5":199,"6":159,"7":159,"8":159}'),
  ('azeitao-cheese',             '{"2":239,"3":189,"4":189,"5":149,"6":149,"7":149,"8":119}'),
  ('sintra-cascais',             '{"2":215,"3":215,"4":199,"5":199,"6":199,"7":189,"8":189}'),
  ('troia-comporta',             '{"2":285,"3":235,"4":235,"5":195,"6":195,"7":195,"8":185}'),
  ('evora-alentejo',             '{"2":279,"3":249,"4":249,"5":199,"6":199,"7":199,"8":199}'),
  ('tomar-coimbra',              '{"2":318,"3":189,"4":189,"5":189,"6":189,"7":189,"8":179}'),
  ('fatima-nazare-obidos',       '{"1":359,"2":229,"3":229,"4":179,"5":179,"6":179,"7":179,"8":159}'),
  ('roman-heritage-alentejo',    '{"2":399,"3":345,"4":345,"5":320,"6":320,"7":299,"8":299}')
ON CONFLICT (tour_id) DO NOTHING;