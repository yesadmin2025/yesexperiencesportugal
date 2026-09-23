-- Operational fields for the bookings hub. All additive and nullable so every
-- existing row, the Stripe checkout flow and Studio keep working unchanged.
alter table public.bookings
  add column if not exists source text not null default 'WEBSITE',
  add column if not exists source_channel text,
  add column if not exists external_booking_ref text,
  add column if not exists external_product_ref text,
  add column if not exists source_message_id text,
  add column if not exists source_thread_id text,
  add column if not exists source_email_url text,
  add column if not exists tour_title text,
  add column if not exists product_code text,
  add column if not exists selected_rate text,
  add column if not exists start_time text,
  add column if not exists pickup_location text,
  add column if not exists dropoff_location text,
  add column if not exists pax_breakdown jsonb,
  add column if not exists language text,
  add column if not exists payment_status text,
  add column if not exists amount_paid integer,
  add column if not exists assigned_guide_id uuid references public.guides(id) on delete set null,
  add column if not exists operational_notes text,
  add column if not exists client_notes text,
  add column if not exists inclusions jsonb,
  add column if not exists exclusions jsonb,
  add column if not exists extras jsonb,
  add column if not exists source_raw_payload jsonb,
  add column if not exists sync_status text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists review_required boolean not null default false,
  add column if not exists review_reason text;

comment on column public.bookings.source is 'WEBSITE | EMAIL | BOKUN | MANUAL';
comment on column public.bookings.source_channel is 'WEBSITE | DIRECT | VIATOR | GETYOURGUIDE | BOKUN | OTHER';
comment on column public.bookings.source_raw_payload is 'Raw parsed source payload. Admin-only, never public.';

-- Strongest dedupe key: one reservation per external reference per source.
create unique index if not exists bookings_source_external_ref_uniq
  on public.bookings (source, external_booking_ref)
  where external_booking_ref is not null;

create index if not exists bookings_source_message_id_idx
  on public.bookings (source_message_id)
  where source_message_id is not null;

create index if not exists bookings_assigned_guide_idx
  on public.bookings (assigned_guide_id)
  where assigned_guide_id is not null;

create index if not exists bookings_preferred_date_idx on public.bookings (preferred_date);
create index if not exists bookings_review_required_idx on public.bookings (review_required) where review_required;

-- Ingestion audit trail: every parsed message, what it decided and why.
create table if not exists public.booking_ingestion_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_channel text,
  gmail_message_id text,
  gmail_thread_id text,
  subject text,
  parser text,
  parse_status text not null,
  action text not null,
  matched_booking_id uuid references public.bookings(id) on delete set null,
  confidence numeric,
  reason text,
  dedupe_key text,
  payload jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists booking_ingestion_log_dedupe_uniq
  on public.booking_ingestion_log (dedupe_key)
  where dedupe_key is not null;
create index if not exists booking_ingestion_log_message_idx
  on public.booking_ingestion_log (gmail_message_id);
create index if not exists booking_ingestion_log_created_idx
  on public.booking_ingestion_log (created_at desc);

grant select, insert, update, delete on public.booking_ingestion_log to service_role;
alter table public.booking_ingestion_log enable row level security;
create policy "admins read ingestion log" on public.booking_ingestion_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Needs-review queue for uncertain email-derived candidates.
create table if not exists public.booking_ingestion_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_channel text,
  gmail_message_id text,
  gmail_thread_id text,
  source_email_url text,
  subject text,
  received_at timestamptz,
  detected jsonb not null default '{}'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  confidence numeric,
  reason text,
  status text not null default 'pending',
  matched_booking_id uuid references public.bookings(id) on delete set null,
  created_booking_id uuid references public.bookings(id) on delete set null,
  raw_payload jsonb,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_ingestion_candidates_slot_uniq
  on public.booking_ingestion_candidates (gmail_message_id, coalesce(detected->>'slot', '0'))
  where gmail_message_id is not null;
create index if not exists booking_ingestion_candidates_status_idx
  on public.booking_ingestion_candidates (status, created_at desc);

grant select, insert, update, delete on public.booking_ingestion_candidates to service_role;
alter table public.booking_ingestion_candidates enable row level security;
create policy "admins read ingestion candidates" on public.booking_ingestion_candidates
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger booking_ingestion_candidates_touch
  before update on public.booking_ingestion_candidates
  for each row execute function public.set_updated_at();

-- Integration state (cursors, enablement) for Gmail and future Bokun sync.
create table if not exists public.integration_state (
  id text primary key,
  enabled boolean not null default false,
  cursor text,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  detail jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.integration_state to service_role;
alter table public.integration_state enable row level security;
create policy "admins read integration state" on public.integration_state
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger integration_state_touch
  before update on public.integration_state
  for each row execute function public.set_updated_at();
