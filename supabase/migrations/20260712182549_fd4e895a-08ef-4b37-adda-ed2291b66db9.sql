-- 1. booking_add_ons: server-owned add-on catalogue -------------------------
CREATE TABLE public.booking_add_ons (
  id text PRIMARY KEY,
  label text NOT NULL,
  pricing_unit text NOT NULL CHECK (pricing_unit IN ('per_person','per_group','per_vehicle','fixed')),
  unit_eur numeric(10,2) NOT NULL CHECK (unit_eur >= 0),
  active boolean NOT NULL DEFAULT true,
  inclusion_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_add_ons TO anon;
GRANT SELECT ON public.booking_add_ons TO authenticated;
GRANT ALL ON public.booking_add_ons TO service_role;
ALTER TABLE public.booking_add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active add-ons"
  ON public.booking_add_ons FOR SELECT
  USING (active = true);
CREATE POLICY "Admins can view all add-ons"
  ON public.booking_add_ons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage add-ons"
  ON public.booking_add_ons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_booking_add_ons_updated_at
  BEFORE UPDATE ON public.booking_add_ons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. tour_available_add_ons: which surface exposes which add-on -------------
-- scope='signature' means tour_id refers to a signature tour id;
-- scope='studio' means tour_id is the studio commercial product key.
CREATE TABLE public.tour_available_add_ons (
  scope text NOT NULL CHECK (scope IN ('signature','studio')),
  tour_id text NOT NULL,
  add_on_id text NOT NULL REFERENCES public.booking_add_ons(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, tour_id, add_on_id)
);
CREATE INDEX idx_tour_available_add_ons_lookup
  ON public.tour_available_add_ons (scope, tour_id) WHERE active = true;
GRANT SELECT ON public.tour_available_add_ons TO anon;
GRANT SELECT ON public.tour_available_add_ons TO authenticated;
GRANT ALL ON public.tour_available_add_ons TO service_role;
ALTER TABLE public.tour_available_add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active tour add-ons"
  ON public.tour_available_add_ons FOR SELECT
  USING (active = true);
CREATE POLICY "Admins can manage tour add-ons"
  ON public.tour_available_add_ons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_tour_available_add_ons_updated_at
  BEFORE UPDATE ON public.tour_available_add_ons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. studio_commercial_bokun_mapping ----------------------------------------
-- One row per Studio commercial skeleton (currently: studio-v3-private-full-day).
CREATE TABLE public.studio_commercial_bokun_mapping (
  commercial_product_key text PRIMARY KEY,
  bokun_product_id text,
  bokun_option_id text,
  bokun_rate_id text,
  pricing_party_size_rule text NOT NULL DEFAULT 'billable_participants'
    CHECK (pricing_party_size_rule IN ('billable_participants','all_participants')),
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Never exposed to anon or authenticated Data API — only edge functions (service_role) read this.
GRANT ALL ON public.studio_commercial_bokun_mapping TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_commercial_bokun_mapping TO authenticated;
ALTER TABLE public.studio_commercial_bokun_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view studio mapping"
  ON public.studio_commercial_bokun_mapping FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage studio mapping"
  ON public.studio_commercial_bokun_mapping FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_studio_commercial_bokun_mapping_updated_at
  BEFORE UPDATE ON public.studio_commercial_bokun_mapping
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the Studio skeleton row (disabled — active flips true once Bókun IDs are set).
INSERT INTO public.studio_commercial_bokun_mapping (commercial_product_key, active, notes)
VALUES ('studio-v3-private-full-day', false,
  'Awaiting real Bókun product/option/rate for the Studio V3 private full-day skeleton. Studio checkout blocks until active=true and IDs set.')
ON CONFLICT (commercial_product_key) DO NOTHING;

-- 4. booking_quotes: server-authoritative signed quote snapshots ------------
CREATE TABLE public.booking_quotes (
  quote_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow text NOT NULL CHECK (flow IN ('signature','tailor','studio')),
  commercial_product_key text NOT NULL,
  commercial_mapping_id text NOT NULL,
  bokun_product_id text NOT NULL,
  bokun_option_id text,
  bokun_rate_id text,
  availability_id text NOT NULL,
  date date NOT NULL,
  start_time text,
  traveller_composition jsonb NOT NULL,
  resolved_guest_mix jsonb NOT NULL,
  pricing_revision text NOT NULL,
  itinerary_revision text,
  itinerary_snapshot jsonb,
  base_pricing jsonb NOT NULL,
  add_on_pricing jsonb NOT NULL,
  final_total_eur numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  quote_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_quotes_expires_at ON public.booking_quotes (expires_at);
CREATE INDEX idx_booking_quotes_commercial ON public.booking_quotes (commercial_product_key, date);
-- Locked down: only edge functions (service_role) touch this.
GRANT ALL ON public.booking_quotes TO service_role;
ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated — the table is effectively invisible outside edge functions.

-- 5. Seed the approved add-on and link it to every Signature tour + Studio --
INSERT INTO public.booking_add_ons (id, label, pricing_unit, unit_eur, active, inclusion_ids, description)
VALUES (
  'coastal-boat-sesimbra',
  'Coastal boat ride from Sesimbra',
  'per_person',
  30,
  true,
  '["boat-sesimbra"]'::jsonb,
  'Optional 60-minute private coastal boat ride from Sesimbra harbour.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tour_available_add_ons (scope, tour_id, add_on_id, active, sort_order)
SELECT 'signature', tour_id, 'coastal-boat-sesimbra', true, 0
FROM (VALUES
  ('arrabida-boat'),
  ('arrabida-wine-allinclusive'),
  ('azeitao-cheese'),
  ('evora-alentejo'),
  ('fatima-nazare-obidos'),
  ('roman-heritage-alentejo'),
  ('sintra-cascais'),
  ('tiles-workshop'),
  ('tomar-coimbra'),
  ('troia-comporta'),
  ('wild-beaches-picnic'),
  ('southwest-vicentine-coast')
) AS t(tour_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.tour_available_add_ons (scope, tour_id, add_on_id, active, sort_order)
VALUES ('studio', 'studio-v3-private-full-day', 'coastal-boat-sesimbra', true, 0)
ON CONFLICT DO NOTHING;