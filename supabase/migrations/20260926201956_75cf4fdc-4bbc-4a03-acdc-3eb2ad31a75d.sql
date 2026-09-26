CREATE TABLE public.builder_session_passes (
  session_id TEXT PRIMARY KEY,
  pass TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.builder_session_passes TO service_role;
ALTER TABLE public.builder_session_passes ENABLE ROW LEVEL SECURITY;