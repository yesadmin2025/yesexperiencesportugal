ALTER TABLE public.experience_content_overrides ADD COLUMN IF NOT EXISTS highlights text[];
ALTER TABLE public.experience_content_revisions ADD COLUMN IF NOT EXISTS highlights text[];
ALTER TABLE public.studio_composable_stops ADD COLUMN IF NOT EXISTS duration_options_minutes integer[] NOT NULL DEFAULT '{}';
ALTER TABLE public.studio_composable_stops ADD COLUMN IF NOT EXISTS quantity_options integer[] NOT NULL DEFAULT '{}';

ALTER TABLE public.studio_composable_stops
  DROP CONSTRAINT IF EXISTS studio_composable_stops_duration_options_valid,
  DROP CONSTRAINT IF EXISTS studio_composable_stops_quantity_options_valid;
ALTER TABLE public.studio_composable_stops
  ADD CONSTRAINT studio_composable_stops_duration_options_valid CHECK (
    duration_options_minutes <@ ARRAY[15,30,45,60,75,90,120,150,180,240,300,360,420,480,540,600,660,720]::integer[]
  ),
  ADD CONSTRAINT studio_composable_stops_quantity_options_valid CHECK (
    quantity_options <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::integer[]
  );

UPDATE public.studio_composable_stops
SET duration_options_minutes = ARRAY[duration_minutes]
WHERE duration_minutes IS NOT NULL
  AND duration_minutes > 0
  AND cardinality(duration_options_minutes) = 0;

UPDATE public.studio_composable_stops
SET quantity_options = ARRAY[1]
WHERE cardinality(quantity_options) = 0;