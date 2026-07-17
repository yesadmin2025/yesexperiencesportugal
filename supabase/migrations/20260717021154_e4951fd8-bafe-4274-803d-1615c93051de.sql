
-- Tour gallery photos uploaded by admin via /admin/photos
CREATE TABLE public.tour_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tour_gallery_photos_tour_idx ON public.tour_gallery_photos (tour_id, sort_order);

GRANT SELECT ON public.tour_gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_gallery_photos TO authenticated;
GRANT ALL ON public.tour_gallery_photos TO service_role;

ALTER TABLE public.tour_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tour gallery photos"
  ON public.tour_gallery_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert tour gallery photos"
  ON public.tour_gallery_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tour gallery photos"
  ON public.tour_gallery_photos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tour gallery photos"
  ON public.tour_gallery_photos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tour_gallery_photos_updated_at
  BEFORE UPDATE ON public.tour_gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend admin grant to include nidiadealmeida85@gmail.com
CREATE OR REPLACE FUNCTION public.grant_admin_for_yes_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF new.email_confirmed_at IS NOT NULL
     AND lower(new.email) IN ('yesexperiences@gmail.com', 'nidiadealmeida85@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN new;
END;
$function$;

-- Trigger on auth.users to run the grant on insert and email confirmation
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_yes_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_yes_email();

-- Backfill: grant admin to nidiadealmeida85@gmail.com if the user already exists and is confirmed
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(email) = 'nidiadealmeida85@gmail.com'
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
