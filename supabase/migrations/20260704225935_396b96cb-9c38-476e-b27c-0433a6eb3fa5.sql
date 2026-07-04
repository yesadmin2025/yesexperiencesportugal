-- Ensure grants exist on dns_watch tables so the admin server fn (service_role)
-- can persist probe results and authenticated admins can read the history.
GRANT SELECT ON public.dns_watch_log TO authenticated;
GRANT ALL ON public.dns_watch_log TO service_role;
GRANT SELECT ON public.dns_watch_state TO authenticated;
GRANT ALL ON public.dns_watch_state TO service_role;

-- Seed state row for legacy hosts if missing.
INSERT INTO public.dns_watch_state (key, all_ready)
VALUES ('legacy-domains', false)
ON CONFLICT (key) DO NOTHING;