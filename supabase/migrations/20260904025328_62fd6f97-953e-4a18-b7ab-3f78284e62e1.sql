ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS travel_date date,
  ADD COLUMN IF NOT EXISTS place text;