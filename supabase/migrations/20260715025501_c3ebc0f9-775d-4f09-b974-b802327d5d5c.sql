
CREATE TABLE public.mcp_owner_allowlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mcp_owner_allowlist TO service_role;
ALTER TABLE public.mcp_owner_allowlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mcp_owner_audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mcp_owner_audit_log TO service_role;
ALTER TABLE public.mcp_owner_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX mcp_owner_audit_log_user_created_idx
  ON public.mcp_owner_audit_log (user_id, created_at DESC);

-- Seed allow-list from user_roles so the UID literal is not written in source.
INSERT INTO public.mcp_owner_allowlist (user_id, note)
SELECT ur.user_id, 'phase-0b-initial-owner'
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;
