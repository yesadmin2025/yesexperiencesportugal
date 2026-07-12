
-- Phase A1: Extend tour_price_tiers to separate synced Bókun mirror from manual overrides,
-- and add the option/rate mapping table so downstream code binds to the exact commercial
-- entity (product + option + rate), not just the product.

-- 1. tour_price_tiers extensions --------------------------------------------
ALTER TABLE public.tour_price_tiers
  ADD COLUMN IF NOT EXISTS synced_tiers jsonb,
  ADD COLUMN IF NOT EXISTS override_tiers jsonb,
  ADD COLUMN IF NOT EXISTS override_metadata jsonb,
  ADD COLUMN IF NOT EXISTS pricing_mode text,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS banded_pricing_enabled boolean NOT NULL DEFAULT false;

-- Backfill: current `tiers` becomes the synced baseline. Existing manual admin
-- edits are preserved as `tiers` (effective) until an admin explicitly promotes
-- them to override_tiers via the new UI in Phase C.
UPDATE public.tour_price_tiers
   SET synced_tiers = COALESCE(synced_tiers, tiers)
 WHERE synced_tiers IS NULL;

-- Constrain pricing_mode values. Use a trigger-free CHECK because the values
-- are a static enum (safe for CHECK — not time-dependent).
ALTER TABLE public.tour_price_tiers
  DROP CONSTRAINT IF EXISTS tour_price_tiers_pricing_mode_check;
ALTER TABLE public.tour_price_tiers
  ADD CONSTRAINT tour_price_tiers_pricing_mode_check
    CHECK (pricing_mode IS NULL OR pricing_mode IN ('flat','date-dependent','slot-dependent','inconsistent'));

COMMENT ON COLUMN public.tour_price_tiers.synced_tiers IS
  'BandedTiers mirror written by sync-bokun-pricing. Never manually edited. Read only for previews and admin comparison.';
COMMENT ON COLUMN public.tour_price_tiers.override_tiers IS
  'Optional admin-authored BandedTiers override. If present and active, wins over synced_tiers for preview rendering only. Live Bókun quote still overrides both at checkout time.';
COMMENT ON COLUMN public.tour_price_tiers.override_metadata IS
  '{createdBy, reason, createdAt, expiresAt?} — required alongside override_tiers so overrides are visibly labelled and auditable.';
COMMENT ON COLUMN public.tour_price_tiers.pricing_mode IS
  'flat | date-dependent | slot-dependent | inconsistent — detected by sync probing.';
COMMENT ON COLUMN public.tour_price_tiers.banded_pricing_enabled IS
  'Per-tour rollout flag. When false the tour keeps the legacy adult-only path even after banded categories are synced.';

-- 2. Bókun option/rate mapping ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.tour_bokun_option_mapping (
  tour_id text PRIMARY KEY,
  bokun_product_id text NOT NULL,
  bokun_option_id text,
  bokun_rate_id text,
  pricing_party_size_rule text NOT NULL DEFAULT 'billable_participants'
    CHECK (pricing_party_size_rule IN ('all_participants','billable_participants')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.tour_bokun_option_mapping TO authenticated;
GRANT ALL ON public.tour_bokun_option_mapping TO service_role;

ALTER TABLE public.tour_bokun_option_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read tour_bokun_option_mapping" ON public.tour_bokun_option_mapping;
CREATE POLICY "Admins read tour_bokun_option_mapping"
  ON public.tour_bokun_option_mapping FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert tour_bokun_option_mapping" ON public.tour_bokun_option_mapping;
CREATE POLICY "Admins insert tour_bokun_option_mapping"
  ON public.tour_bokun_option_mapping FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update tour_bokun_option_mapping" ON public.tour_bokun_option_mapping;
CREATE POLICY "Admins update tour_bokun_option_mapping"
  ON public.tour_bokun_option_mapping FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete tour_bokun_option_mapping" ON public.tour_bokun_option_mapping;
CREATE POLICY "Admins delete tour_bokun_option_mapping"
  ON public.tour_bokun_option_mapping FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_tour_bokun_option_mapping_updated_at
  BEFORE UPDATE ON public.tour_bokun_option_mapping
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
