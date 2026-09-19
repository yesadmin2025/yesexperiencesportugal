CREATE TABLE public.home_path_content (
  path_id text PRIMARY KEY CHECK (path_id IN ('studio', 'signature', 'designer', 'proposals', 'corporate')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  route_label text NOT NULL CHECK (char_length(route_label) BETWEEN 1 AND 120),
  destination text NOT NULL CHECK (char_length(destination) BETWEEN 1 AND 80),
  photo_src text NOT NULL CHECK (char_length(photo_src) BETWEEN 1 AND 1000),
  photo_alt text NOT NULL CHECK (char_length(photo_alt) BETWEEN 1 AND 240),
  source_url text,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_path_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_path_content TO authenticated;
GRANT ALL ON public.home_path_content TO service_role;

ALTER TABLE public.home_path_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published home paths"
ON public.home_path_content
FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can view every home path"
ON public.home_path_content
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create home paths"
ON public.home_path_content
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update home paths"
ON public.home_path_content
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete home paths"
ON public.home_path_content
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_path_content_set_updated_at
BEFORE UPDATE ON public.home_path_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.home_path_content (path_id, title, route_label, destination, photo_src, photo_alt)
VALUES
('studio', 'Shape a day around you', 'Lisbon → Azeitão', 'Azeitão', '/__l5e/assets-v1/8120de53-e1e8-40ad-b25d-20db276b447c/azulejo-private-workshop-1600.webp', 'Private guests painting traditional azulejos together in Azeitão.'),
('signature', 'A private day, ready to go', 'Lisbon → Arrábida', 'Arrábida', '/__l5e/assets-v1/82d404e6-261a-4eff-9fb9-2e289fe9c43d/arrabida-team-viewpoint-1600.webp', 'Private guests pausing with their local host above the Arrábida coast.'),
('designer', 'Plan a whole Portugal journey', 'A journey through Alentejo', 'Alentejo', '/__l5e/assets-v1/7d9a46a4-2339-4d64-88f8-29e2bef68114/alentejo-group-ruins-1600.webp', 'Private guests sharing a hosted cultural moment among Roman ruins in Alentejo.'),
('proposals', 'A private moment, planned discreetly', 'Lisbon → Tróia', 'Tróia', '/__l5e/assets-v1/9355d68c-16cf-449d-b092-c96908459ef6/troia-couple-coast-1600.webp', 'Couple walking together above the Atlantic during a private day in Portugal.'),
('corporate', 'Bring people together in Portugal', 'Lisbon → Azeitão', 'Azeitão', '/__l5e/assets-v1/838dd568-4952-4724-b908-4ff2d103b11d/winery-group-orange-tree-1600.webp', 'Private group welcomed at a Setúbal Peninsula winery during a hosted day.');