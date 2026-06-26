
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can manage all builder reference files') THEN
    EXECUTE 'DROP POLICY "Admins can manage all builder reference files" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Admins can manage all builder reference files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'builder-references' AND public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (bucket_id = 'builder-references' AND public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can read builder references') THEN
    EXECUTE 'DROP POLICY "Admins can read builder references" ON storage.objects';
    EXECUTE $p$CREATE POLICY "Admins can read builder references" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'builder-references' AND public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  END IF;
END$$;
