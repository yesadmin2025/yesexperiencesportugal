-- 1. Add platform_tiers column
ALTER TABLE public.tour_price_tiers
  ADD COLUMN IF NOT EXISTS platform_tiers jsonb;

-- 2. Copy existing tiers into platform_tiers (only if null)
UPDATE public.tour_price_tiers
   SET platform_tiers = tiers
 WHERE platform_tiers IS NULL;

-- 3. Recompute tiers as platform × 0.85, rounded
UPDATE public.tour_price_tiers
   SET tiers = (
     SELECT jsonb_object_agg(k, round((v::numeric) * 0.85)::int)
       FROM jsonb_each_text(platform_tiers) AS t(k, v)
   )
 WHERE platform_tiers IS NOT NULL;

-- 4. Backfill guard: if any future row is inserted with tiers but no
--    platform_tiers, treat platform_tiers as equal to tiers (Viator parity).
COMMENT ON COLUMN public.tour_price_tiers.platform_tiers IS
  'Reference price shown on Viator/GetYourGuide, keyed by pax count "1".."8". The public "tiers" column is the direct-booking price = platform_tiers * 0.85 rounded.';
COMMENT ON COLUMN public.tour_price_tiers.tiers IS
  'Direct-booking per-pax price in EUR, keyed by pax count "1".."8". = platform_tiers * 0.85 rounded (15% below the platform price).';