-- P23 direct booking prices: 15% below the owner's Viator adult bands, rounded to whole EUR.
-- New tour only; no changes to existing products or checkout logic.
INSERT INTO public.tour_price_tiers (tour_id, tiers, platform_tiers)
VALUES (
  'p23-artisan-pottery-cork',
  '{"2":288,"3":254,"4":254,"5":254,"6":203,"7":203,"8":203}'::jsonb,
  '{"2":339,"3":299,"4":299,"5":299,"6":239,"7":239,"8":239}'::jsonb
)
ON CONFLICT (tour_id) DO NOTHING;