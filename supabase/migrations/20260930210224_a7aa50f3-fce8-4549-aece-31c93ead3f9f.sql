ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS app_invited_at timestamptz, ADD COLUMN IF NOT EXISTS app_invite_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS guides_email_lower_uniq ON public.guides (lower(trim(email))) WHERE email IS NOT NULL AND trim(email) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS guides_user_id_uniq ON public.guides (user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guide_claim_account()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE em text; gid uuid; n int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  -- Already linked: idempotent, open the app directly.
  gid := public.current_guide_id();
  IF gid IS NOT NULL THEN RETURN gid; END IF;
  IF EXISTS (SELECT 1 FROM public.guides WHERE user_id = auth.uid()) THEN RETURN NULL; END IF;
  SELECT lower(trim(email)) INTO em FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF em IS NULL OR em = '' THEN RETURN NULL; END IF;
  SELECT count(*) INTO n FROM public.guides WHERE active AND user_id IS NULL AND lower(trim(email)) = em;
  IF n <> 1 THEN RETURN NULL; END IF;
  UPDATE public.guides SET user_id = auth.uid()
   WHERE active AND user_id IS NULL AND lower(trim(email)) = em
   RETURNING id INTO gid;
  RETURN gid;
END $function$;

REVOKE EXECUTE ON FUNCTION public.guide_request_access(text, text) FROM authenticated, anon, public;