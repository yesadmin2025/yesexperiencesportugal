
-- Tighten studio_v3_leads RLS: validate insert payload, add explicit admin-only read/update/delete policies.

DROP POLICY IF EXISTS "Anyone can submit a Studio V3 lead" ON public.studio_v3_leads;

CREATE POLICY "Anyone can submit a Studio V3 lead"
ON public.studio_v3_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  intent IN ('book','refine')
  AND status = 'requested'
  AND char_length(contact_name) BETWEEN 1 AND 120
  AND char_length(contact_email) BETWEEN 3 AND 255
  AND contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND (contact_phone IS NULL OR char_length(contact_phone) <= 40)
  AND (contact_note IS NULL OR char_length(contact_note) <= 2000)
  AND (journey_title IS NULL OR char_length(journey_title) <= 200)
  AND (skeleton_tour_key IS NULL OR char_length(skeleton_tour_key) <= 120)
);

CREATE POLICY "Admins can read Studio V3 leads"
ON public.studio_v3_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update Studio V3 leads"
ON public.studio_v3_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete Studio V3 leads"
ON public.studio_v3_leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
