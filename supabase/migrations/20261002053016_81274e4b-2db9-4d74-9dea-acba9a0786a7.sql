CREATE TABLE public.tailor_price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL,
  action_id text NOT NULL,
  action_kind text NOT NULL CHECK (action_kind IN ('stop','choice_slot','lunch','optional')),
  direction text NOT NULL CHECK (direction IN ('add','remove')),
  label text NOT NULL,
  default_in_day boolean NOT NULL DEFAULT false,
  adjustment_type text NOT NULL DEFAULT 'fixed_eur' CHECK (adjustment_type IN ('fixed_eur','percent')),
  adjustment_value numeric(10,2) CHECK (adjustment_value IS NULL OR adjustment_value >= 0),
  unit text NOT NULL DEFAULT 'per_person' CHECK (unit IN ('per_person','per_group','per_vehicle','flat')),
  policy_group text,
  active boolean NOT NULL DEFAULT true,
  min_party integer CHECK (min_party IS NULL OR min_party >= 1),
  max_party integer CHECK (max_party IS NULL OR max_party >= 1),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (tour_id, action_id, direction)
);
GRANT SELECT ON public.tailor_price_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tailor_price_rules TO authenticated;
GRANT ALL ON public.tailor_price_rules TO service_role;
ALTER TABLE public.tailor_price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read Tailor prices" ON public.tailor_price_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert Tailor prices" ON public.tailor_price_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update Tailor prices" ON public.tailor_price_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete Tailor prices" ON public.tailor_price_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tailor_price_policies (
  policy_group text PRIMARY KEY,
  max_total_pct numeric(5,4) NOT NULL CHECK (max_total_pct >= 0 AND max_total_pct <= 1),
  floor_pct_of_base numeric(5,4) NOT NULL CHECK (floor_pct_of_base >= 0 AND floor_pct_of_base <= 1),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.tailor_price_policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tailor_price_policies TO authenticated;
GRANT ALL ON public.tailor_price_policies TO service_role;
ALTER TABLE public.tailor_price_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read Tailor price policies" ON public.tailor_price_policies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage Tailor price policies" ON public.tailor_price_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tailor_price_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); NEW.updated_by = auth.uid(); RETURN NEW; END; $$;
CREATE TRIGGER tailor_price_rules_touch BEFORE UPDATE ON public.tailor_price_rules FOR EACH ROW EXECUTE FUNCTION public.tailor_price_touch();
CREATE TRIGGER tailor_price_policies_touch BEFORE UPDATE ON public.tailor_price_policies FOR EACH ROW EXECUTE FUNCTION public.tailor_price_touch();