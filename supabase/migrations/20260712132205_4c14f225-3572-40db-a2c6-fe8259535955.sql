ALTER TABLE public.tour_price_tiers
  ADD COLUMN IF NOT EXISTS bokun_categories jsonb,
  ADD COLUMN IF NOT EXISTS synced_from_bokun_at timestamptz;

COMMENT ON COLUMN public.tour_price_tiers.tiers IS
  'Per-tour price tiers. Two accepted shapes: (1) legacy flat {"1":..,"8":..} = adult per-pax EUR by group size; (2) banded { "adult": {"1":..}, "youth"?: {"1":..}, "child"?: {"1":..}, "infant"?: number }. Consumers must accept both.';

COMMENT ON COLUMN public.tour_price_tiers.bokun_categories IS
  'Snapshot of Bókun pricingCategories mapped to age bands: { adult: {id,title,minAge?,maxAge?}, youth?, child?, infant? }. Written by sync-bokun-pricing.';