
CREATE TABLE public.studio_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_token TEXT NOT NULL UNIQUE,
  email TEXT,
  draft JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_studio_drafts_token ON public.studio_drafts(resume_token);
CREATE INDEX idx_studio_drafts_expires ON public.studio_drafts(expires_at);

-- Service role only (server functions access via supabaseAdmin)
GRANT ALL ON public.studio_drafts TO service_role;

ALTER TABLE public.studio_drafts ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — all access goes through server functions
-- using the service role key.

CREATE TRIGGER studio_drafts_set_updated_at
BEFORE UPDATE ON public.studio_drafts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
