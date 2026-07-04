
CREATE TABLE public.legacy_domain_unlink_checklist (
  item_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  note TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_domain_unlink_checklist TO authenticated;
GRANT ALL ON public.legacy_domain_unlink_checklist TO service_role;

ALTER TABLE public.legacy_domain_unlink_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read checklist"
  ON public.legacy_domain_unlink_checklist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert checklist"
  ON public.legacy_domain_unlink_checklist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update checklist"
  ON public.legacy_domain_unlink_checklist FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete checklist"
  ON public.legacy_domain_unlink_checklist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_legacy_domain_unlink_checklist_updated_at
  BEFORE UPDATE ON public.legacy_domain_unlink_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
