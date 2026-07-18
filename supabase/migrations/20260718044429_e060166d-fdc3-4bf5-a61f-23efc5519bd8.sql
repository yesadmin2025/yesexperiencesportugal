
CREATE TABLE public.editorial_image_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  slot_index integer NOT NULL,
  photo_src text NOT NULL,
  alt text NOT NULL,
  caption text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_key, slot_index, status)
);

GRANT SELECT ON public.editorial_image_overrides TO anon;
GRANT SELECT ON public.editorial_image_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.editorial_image_overrides TO authenticated;
GRANT ALL ON public.editorial_image_overrides TO service_role;

ALTER TABLE public.editorial_image_overrides ENABLE ROW LEVEL SECURITY;

-- Public can only read published overrides
CREATE POLICY "Public reads published overrides"
  ON public.editorial_image_overrides
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admins can read all
CREATE POLICY "Admins read all overrides"
  ON public.editorial_image_overrides
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "Admins insert overrides"
  ON public.editorial_image_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins update overrides"
  ON public.editorial_image_overrides
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins delete overrides"
  ON public.editorial_image_overrides
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER editorial_image_overrides_set_updated_at
  BEFORE UPDATE ON public.editorial_image_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX editorial_image_overrides_module_status_idx
  ON public.editorial_image_overrides (module_key, status);
