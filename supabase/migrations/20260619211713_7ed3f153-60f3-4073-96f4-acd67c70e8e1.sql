DROP POLICY IF EXISTS "Anon can read saved signatures by token" ON public.studio_v3_leads;
REVOKE SELECT ON public.studio_v3_leads FROM anon;