DROP POLICY IF EXISTS "Anyone can read Tailor price policies" ON public.tailor_price_policies;
REVOKE SELECT ON public.tailor_price_policies FROM anon;
GRANT ALL ON public.tailor_price_policies TO service_role;