CREATE POLICY "Admins can view builder events"
ON public.builder_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view hero ab assignments"
ON public.hero_ab_assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));