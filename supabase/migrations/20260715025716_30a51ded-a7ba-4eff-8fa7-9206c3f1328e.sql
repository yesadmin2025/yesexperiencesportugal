
REVOKE ALL ON public.mcp_owner_allowlist FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.mcp_owner_audit_log FROM anon, authenticated, PUBLIC;
REVOKE ALL ON SEQUENCE public.mcp_owner_audit_log_id_seq FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.mcp_owner_allowlist TO service_role;
GRANT ALL ON public.mcp_owner_audit_log TO service_role;
GRANT ALL ON SEQUENCE public.mcp_owner_audit_log_id_seq TO service_role;
