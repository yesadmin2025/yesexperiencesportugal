alter table public.booking_ingestion_candidates
  add column if not exists slot integer not null default 0;

drop index if exists booking_ingestion_candidates_slot_uniq;

create unique index if not exists booking_ingestion_candidates_msg_slot_uniq
  on public.booking_ingestion_candidates (gmail_message_id, slot)
  where gmail_message_id is not null;