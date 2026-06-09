-- Add columns for saveable Signatures
ALTER TABLE public.studio_v3_leads
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz;

-- Unique token (nullable allowed; only saved rows get one)
CREATE UNIQUE INDEX IF NOT EXISTS studio_v3_leads_share_token_key
  ON public.studio_v3_leads (share_token)
  WHERE share_token IS NOT NULL;

-- Allow anonymous read of a single saved Signature by exact token match.
-- No listing: policy requires share_token IS NOT NULL AND status = 'saved'.
-- Anon must still pass an exact token in the WHERE clause; PostgREST will
-- only return the row when the filter matches.
GRANT SELECT ON public.studio_v3_leads TO anon;

DROP POLICY IF EXISTS "Anon can read saved signatures by token" ON public.studio_v3_leads;
CREATE POLICY "Anon can read saved signatures by token"
  ON public.studio_v3_leads
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL AND status = 'saved');
