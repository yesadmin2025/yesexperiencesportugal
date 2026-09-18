CREATE TABLE public.experience_content_overrides (
  tour_id text PRIMARY KEY,
  blurb text,
  intro text,
  fits_best text,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.experience_content_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_content_overrides TO authenticated;
GRANT ALL ON public.experience_content_overrides TO service_role;

ALTER TABLE public.experience_content_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published experience copy is public"
ON public.experience_content_overrides FOR SELECT TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can read all experience copy"
ON public.experience_content_overrides FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert experience copy"
ON public.experience_content_overrides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update experience copy"
ON public.experience_content_overrides FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete experience copy"
ON public.experience_content_overrides FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER experience_content_overrides_set_updated_at
BEFORE UPDATE ON public.experience_content_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.experience_content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL,
  blurb text,
  intro text,
  fits_best text,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX experience_content_revisions_tour_idx
ON public.experience_content_revisions (tour_id, created_at DESC);

GRANT SELECT, INSERT ON public.experience_content_revisions TO authenticated;
GRANT ALL ON public.experience_content_revisions TO service_role;

ALTER TABLE public.experience_content_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read experience copy history"
ON public.experience_content_revisions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write experience copy history"
ON public.experience_content_revisions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));