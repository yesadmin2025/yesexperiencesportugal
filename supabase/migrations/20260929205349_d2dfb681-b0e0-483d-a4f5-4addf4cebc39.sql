ALTER TABLE public.experience_content_overrides ADD COLUMN IF NOT EXISTS duration_hours text;
ALTER TABLE public.experience_content_revisions ADD COLUMN IF NOT EXISTS duration_hours text;