-- Security hardening: anon must not see PII on studio_v3_leads even with a share token.
-- Keep the existing share-by-token SELECT policy as-is; just narrow column-level access for anon.
REVOKE SELECT (contact_name, contact_email, contact_phone) ON public.studio_v3_leads FROM anon;