CREATE TABLE public.experience_seo_drafts (
  tour_id text PRIMARY KEY,
  page_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  h1 text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_seo_drafts TO authenticated;
GRANT ALL ON public.experience_seo_drafts TO service_role;
ALTER TABLE public.experience_seo_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read SEO drafts" ON public.experience_seo_drafts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create SEO drafts" ON public.experience_seo_drafts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND updated_by = auth.uid());
CREATE POLICY "Admins can update SEO drafts" ON public.experience_seo_drafts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND updated_by = auth.uid());
CREATE POLICY "Admins can delete SEO drafts" ON public.experience_seo_drafts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER experience_seo_drafts_updated_at BEFORE UPDATE ON public.experience_seo_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();