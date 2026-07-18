ALTER TABLE public.tour_gallery_photos
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer;

ALTER TABLE public.tour_gallery_photos
  ADD CONSTRAINT tour_gallery_photos_dimensions_positive
  CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0));

CREATE UNIQUE INDEX IF NOT EXISTS tour_gallery_photos_storage_path_unique
  ON public.tour_gallery_photos (storage_path);

CREATE UNIQUE INDEX IF NOT EXISTS tour_gallery_photos_content_hash_unique
  ON public.tour_gallery_photos (content_hash)
  WHERE content_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tour_gallery_photos_one_cover_per_tour
  ON public.tour_gallery_photos (tour_id)
  WHERE is_cover = true;