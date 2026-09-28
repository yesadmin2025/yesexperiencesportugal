ALTER TABLE public.tour_gallery_photos ADD COLUMN IF NOT EXISTS stop_label text;

CREATE INDEX IF NOT EXISTS tour_gallery_photos_tour_stop_idx
  ON public.tour_gallery_photos (tour_id, stop_label)
  WHERE stop_label IS NOT NULL;