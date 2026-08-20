CREATE TABLE public.email_deferred_sends (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  template_name text not null,
  recipient_email text not null,
  subject text not null,
  html text not null,
  body_text text not null,
  idempotency_key text not null unique,
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.email_deferred_sends TO service_role;
ALTER TABLE public.email_deferred_sends ENABLE ROW LEVEL SECURITY;
CREATE INDEX email_deferred_sends_pending_idx ON public.email_deferred_sends (created_at) WHERE delivered_at IS NULL;