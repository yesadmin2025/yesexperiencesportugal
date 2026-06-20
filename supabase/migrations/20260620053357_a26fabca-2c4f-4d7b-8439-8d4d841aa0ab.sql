-- Restrict tour_price_tiers writes to admins only.
DROP POLICY IF EXISTS "Authenticated users can insert tour price tiers" ON public.tour_price_tiers;
DROP POLICY IF EXISTS "Authenticated users can update tour price tiers" ON public.tour_price_tiers;
DROP POLICY IF EXISTS "Authenticated users can delete tour price tiers" ON public.tour_price_tiers;

CREATE POLICY "Admins can insert tour price tiers"
  ON public.tour_price_tiers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update tour price tiers"
  ON public.tour_price_tiers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete tour price tiers"
  ON public.tour_price_tiers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));