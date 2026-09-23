-- WhatsApp evidence store: raw delivery inbox + normalised conversations/messages.

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null unique,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  first_message_at timestamptz,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  message_count integer not null default 0,
  matched_booking_id uuid references public.bookings(id) on delete set null,
  match_confidence numeric,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  phone_e164 text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  sent_at timestamptz,
  body text,
  delivery_status text,
  delivery_status_at timestamptz,
  parsed jsonb,
  matched_booking_id uuid references public.bookings(id) on delete set null,
  match_rule text,
  match_confidence numeric,
  review_reason text,
  processed_at timestamptz,
  ingest_source text not null default 'webhook',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_phone_idx on public.whatsapp_messages (phone_e164, sent_at desc);
create index if not exists whatsapp_messages_booking_idx on public.whatsapp_messages (matched_booking_id);
create index if not exists whatsapp_messages_unprocessed_idx on public.whatsapp_messages (processed_at) where processed_at is null;
create index if not exists whatsapp_webhook_events_pending_idx on public.whatsapp_webhook_events (received_at) where processed_at is null;
create index if not exists whatsapp_conversations_booking_idx on public.whatsapp_conversations (matched_booking_id);

grant select on public.whatsapp_webhook_events to authenticated;
grant all on public.whatsapp_webhook_events to service_role;
grant select on public.whatsapp_conversations to authenticated;
grant all on public.whatsapp_conversations to service_role;
grant select on public.whatsapp_messages to authenticated;
grant all on public.whatsapp_messages to service_role;

alter table public.whatsapp_webhook_events enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "Admins read whatsapp webhook events"
  on public.whatsapp_webhook_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins read whatsapp conversations"
  on public.whatsapp_conversations for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins read whatsapp messages"
  on public.whatsapp_messages for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists whatsapp_webhook_events_touch on public.whatsapp_webhook_events;
create trigger whatsapp_webhook_events_touch before update on public.whatsapp_webhook_events
  for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_conversations_touch on public.whatsapp_conversations;
create trigger whatsapp_conversations_touch before update on public.whatsapp_conversations
  for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_messages_touch on public.whatsapp_messages;
create trigger whatsapp_messages_touch before update on public.whatsapp_messages
  for each row execute function public.set_updated_at();