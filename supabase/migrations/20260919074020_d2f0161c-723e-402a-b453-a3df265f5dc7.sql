CREATE TABLE public.guides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT ALL ON public.guides TO service_role;

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage guides" ON public.guides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER guides_set_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();