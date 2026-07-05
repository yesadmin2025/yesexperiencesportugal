
CREATE TABLE IF NOT EXISTS public.gbp_removal_state (
  id integer PRIMARY KEY DEFAULT 1,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT gbp_removal_state_single_row CHECK (id = 1)
);
INSERT INTO public.gbp_removal_state (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.gbp_removal_state TO authenticated;
GRANT ALL ON public.gbp_removal_state TO service_role;

ALTER TABLE public.gbp_removal_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read gbp_removal_state"
  ON public.gbp_removal_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update gbp_removal_state"
  ON public.gbp_removal_state FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert gbp_removal_state"
  ON public.gbp_removal_state FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.gbp_removal_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS gbp_removal_evidence_created_at_idx
  ON public.gbp_removal_evidence (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gbp_removal_evidence TO authenticated;
GRANT ALL ON public.gbp_removal_evidence TO service_role;

ALTER TABLE public.gbp_removal_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read gbp_removal_evidence"
  ON public.gbp_removal_evidence FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert gbp_removal_evidence"
  ON public.gbp_removal_evidence FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update gbp_removal_evidence"
  ON public.gbp_removal_evidence FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete gbp_removal_evidence"
  ON public.gbp_removal_evidence FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for gbp-evidence bucket (admin-only)
DROP POLICY IF EXISTS "Admins read gbp-evidence objects" ON storage.objects;
CREATE POLICY "Admins read gbp-evidence objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gbp-evidence' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload gbp-evidence objects" ON storage.objects;
CREATE POLICY "Admins upload gbp-evidence objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gbp-evidence' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete gbp-evidence objects" ON storage.objects;
CREATE POLICY "Admins delete gbp-evidence objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gbp-evidence' AND public.has_role(auth.uid(), 'admin'));
