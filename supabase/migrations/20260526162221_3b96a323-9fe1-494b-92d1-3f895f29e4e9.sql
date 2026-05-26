
CREATE TABLE public.studio_v2_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT NOT NULL UNIQUE,
  profile JSONB NOT NULL,
  region TEXT,
  archetype TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_studio_v2_sessions_share_token ON public.studio_v2_sessions (share_token);

GRANT ALL ON public.studio_v2_sessions TO service_role;

ALTER TABLE public.studio_v2_sessions ENABLE ROW LEVEL SECURITY;
-- No public policies — all access goes through server functions using the service role.
