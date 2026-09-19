GRANT ALL ON public.email_deferred_sends TO service_role;
CREATE POLICY "Service role can manage deferred emails"
ON public.email_deferred_sends FOR ALL TO service_role
USING (true) WITH CHECK (true);