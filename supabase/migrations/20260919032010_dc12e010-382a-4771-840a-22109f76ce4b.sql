DROP POLICY IF EXISTS "Service role can read email send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can insert email send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update email send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can manage email send state" ON public.email_send_state;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read unsubscribe tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can insert unsubscribe tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can update unsubscribe tokens" ON public.email_unsubscribe_tokens;

CREATE POLICY "Service role can read email send log"
ON public.email_send_log FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert email send log"
ON public.email_send_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update email send log"
ON public.email_send_log FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage email send state"
ON public.email_send_state FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can read suppressed emails"
ON public.suppressed_emails FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert suppressed emails"
ON public.suppressed_emails FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR UPDATE TO service_role USING (true) WITH CHECK (true);