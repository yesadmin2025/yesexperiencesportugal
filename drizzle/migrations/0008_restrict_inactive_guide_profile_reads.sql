ALTER POLICY "Guide reads own profile" ON public.guides
  USING (user_id = auth.uid() AND active = true);