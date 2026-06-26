
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='cleanup_expired_builder_references') THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_expired_builder_references() SET search_path = public, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cleanup_expired_builder_references() FROM PUBLIC, anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='hero_ab_events_validate') THEN
    EXECUTE 'ALTER FUNCTION public.hero_ab_events_validate() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='hero_ab_assignments_validate') THEN
    EXECUTE 'ALTER FUNCTION public.hero_ab_assignments_validate() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enqueue_email') THEN
    EXECUTE 'ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='read_email_batch') THEN
    EXECUTE 'ALTER FUNCTION public.read_email_batch(text, int, int) SET search_path = public, pgmq, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, int, int) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.read_email_batch(text, int, int) TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='delete_email') THEN
    EXECUTE 'ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='move_to_dlq') THEN
    EXECUTE 'ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role';
  END IF;
END$$;

DROP POLICY IF EXISTS "Anon cannot select builder_journeys" ON public.builder_journeys;
CREATE POLICY "Anon cannot select builder_journeys"
  ON public.builder_journeys AS RESTRICTIVE FOR SELECT TO anon USING (false);
REVOKE ALL ON public.builder_journeys FROM anon, authenticated;
GRANT ALL ON public.builder_journeys TO service_role;

DROP POLICY IF EXISTS "Deny insert builder_rate_limits" ON public.builder_rate_limits;
CREATE POLICY "Deny insert builder_rate_limits"
  ON public.builder_rate_limits FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Deny update builder_rate_limits" ON public.builder_rate_limits;
CREATE POLICY "Deny update builder_rate_limits"
  ON public.builder_rate_limits FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.builder_rate_limits FROM anon, authenticated;
GRANT ALL ON public.builder_rate_limits TO service_role;

DROP POLICY IF EXISTS "Deny insert builder_route_cache" ON public.builder_route_cache;
CREATE POLICY "Deny insert builder_route_cache"
  ON public.builder_route_cache FOR INSERT TO anon, authenticated WITH CHECK (false);
