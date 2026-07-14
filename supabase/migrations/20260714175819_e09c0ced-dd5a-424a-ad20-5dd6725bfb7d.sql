ALTER TABLE public.tour_price_tiers
  DROP COLUMN IF EXISTS bokun_categories,
  DROP COLUMN IF EXISTS synced_from_bokun_at,
  DROP COLUMN IF EXISTS synced_tiers,
  DROP COLUMN IF EXISTS override_tiers,
  DROP COLUMN IF EXISTS override_metadata,
  DROP COLUMN IF EXISTS pricing_mode,
  DROP COLUMN IF EXISTS source_version,
  DROP COLUMN IF EXISTS banded_pricing_enabled;

DROP TABLE IF EXISTS public.tour_bokun_option_mapping CASCADE;
DROP TABLE IF EXISTS public.tour_bokun_mapping CASCADE;
DROP TABLE IF EXISTS public.studio_commercial_bokun_mapping CASCADE;