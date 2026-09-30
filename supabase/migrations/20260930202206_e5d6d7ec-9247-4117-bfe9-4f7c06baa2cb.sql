
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  provider text NOT NULL CHECK (provider IN ('stripe','voucher_email','viator','getyourguide','bokun','manual','other')),
  kind text NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment','voucher','refund')),
  environment text NOT NULL DEFAULT 'unknown' CHECK (environment IN ('live','sandbox','unknown')),
  provider_event_ids text[] NOT NULL DEFAULT '{}',
  provider_payment_id text,
  payment_intent_id text,
  external_reference text,
  payer_name text,
  payer_email text,
  amount integer,
  currency text,
  event_at timestamptz,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  suggested_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','suggested','matched','needs_review')),
  match_confidence numeric,
  match_reason text,
  match_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched_by uuid,
  matched_at timestamptz,
  source_table text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_matched_has_booking CHECK ((match_status = 'matched') = (booking_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_records_provider_payment_uq ON public.payment_records(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_records_voucher_ref_uq ON public.payment_records(provider, external_reference) WHERE kind = 'voucher' AND external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_records_booking_idx ON public.payment_records(booking_id);
CREATE INDEX IF NOT EXISTS payment_records_status_idx ON public.payment_records(match_status);

GRANT SELECT ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read payment records" ON public.payment_records;
CREATE POLICY "Admins read payment records" ON public.payment_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.payment_match_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('backfill_created','auto_linked','suggested','needs_review','unmatched','match','undo','event_folded')),
  previous_status text,
  new_status text,
  previous_booking_id uuid,
  booking_id uuid,
  confidence numeric,
  reason text,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_match_log_payment_idx ON public.payment_match_log(payment_id, created_at);
GRANT SELECT ON public.payment_match_log TO authenticated;
GRANT ALL ON public.payment_match_log TO service_role;
ALTER TABLE public.payment_match_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read payment match log" ON public.payment_match_log;
CREATE POLICY "Admins read payment match log" ON public.payment_match_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.payment_records_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS payment_records_touch ON public.payment_records;
CREATE TRIGGER payment_records_touch BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.payment_records_touch();

-- Link a payment to the booking that already carries its exact reference. Never overrides a manual state.
CREATE OR REPLACE FUNCTION public.payments_autolink(_payment_id uuid, _bookings uuid[], _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_records;
BEGIN
  SELECT * INTO p FROM public.payment_records WHERE id = _payment_id FOR UPDATE;
  IF p.id IS NULL OR p.match_status = 'matched' THEN RETURN; END IF;
  -- Someone reviewed and undid this link; do not silently redo it.
  IF EXISTS (SELECT 1 FROM public.payment_match_log WHERE payment_id = p.id AND action = 'undo') THEN RETURN; END IF;
  IF coalesce(array_length(_bookings, 1), 0) = 1 THEN
    UPDATE public.payment_records SET booking_id = _bookings[1], suggested_booking_id = NULL, match_status = 'matched',
      match_confidence = 1, match_reason = _reason, matched_at = now(), matched_by = NULL WHERE id = p.id;
    INSERT INTO public.payment_match_log(payment_id, action, previous_status, new_status, booking_id, confidence, reason)
      VALUES (p.id, 'auto_linked', p.match_status, 'matched', _bookings[1], 1, _reason);
  ELSIF coalesce(array_length(_bookings, 1), 0) > 1 AND p.match_status <> 'needs_review' THEN
    UPDATE public.payment_records SET match_status = 'needs_review', match_reason = 'Same reference on several bookings',
      match_candidates = to_jsonb(_bookings) WHERE id = p.id;
    INSERT INTO public.payment_match_log(payment_id, action, previous_status, new_status, reason)
      VALUES (p.id, 'needs_review', p.match_status, 'needs_review', 'Same reference on several bookings');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.payments_upsert_stripe_session(_session_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE agg record; pid uuid; existing public.payment_records; bids uuid[];
BEGIN
  SELECT array_agg(DISTINCT e.event_id) FILTER (WHERE e.event_id IS NOT NULL) AS ids,
         min(e.received_at) AS first_at, max(e.amount_total) AS amount, max(lower(e.currency)) AS currency,
         max(lower(e.customer_email)) AS email, max(e.stripe_env) AS env, count(*) AS deliveries
    INTO agg
    FROM public.stripe_webhook_events e
   WHERE e.session_id = _session_id AND e.event_type = 'checkout.session.completed'
     AND e.payment_status = 'paid' AND e.verified;
  IF agg.ids IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO existing FROM public.payment_records WHERE idempotency_key = 'stripe:session:' || _session_id;
  IF existing.id IS NULL THEN
    INSERT INTO public.payment_records(idempotency_key, provider, kind, environment, provider_event_ids, provider_payment_id,
        payer_email, amount, currency, event_at, source_table, metadata)
    VALUES ('stripe:session:' || _session_id, 'stripe', 'payment',
        CASE WHEN agg.env = 'live' THEN 'live' WHEN agg.env = 'sandbox' THEN 'sandbox' ELSE 'unknown' END,
        agg.ids, _session_id, agg.email, agg.amount, agg.currency, agg.first_at, 'stripe_webhook_events',
        jsonb_build_object('webhook_deliveries', agg.deliveries))
    RETURNING id INTO pid;
    INSERT INTO public.payment_match_log(payment_id, action, new_status, reason)
      VALUES (pid, 'backfill_created', 'unmatched', format('Stripe checkout %s (%s webhook deliveries)', _session_id, agg.deliveries));
  ELSE
    pid := existing.id;
    IF NOT (existing.provider_event_ids @> agg.ids) THEN
      UPDATE public.payment_records SET provider_event_ids = ARRAY(SELECT DISTINCT unnest(existing.provider_event_ids || agg.ids)),
        metadata = metadata || jsonb_build_object('webhook_deliveries', agg.deliveries) WHERE id = pid;
      INSERT INTO public.payment_match_log(payment_id, action, reason) VALUES (pid, 'event_folded', 'Repeat Stripe delivery folded into existing payment');
    END IF;
  END IF;

  SELECT array_agg(id) INTO bids FROM public.bookings WHERE stripe_session_id = _session_id;
  PERFORM public.payments_autolink(pid, bids, 'Booking carries this exact Stripe checkout reference');
  UPDATE public.payment_records p SET payer_name = b.customer_name, payment_intent_id = coalesce(p.payment_intent_id, b.stripe_payment_intent_id)
    FROM public.bookings b WHERE p.id = pid AND p.booking_id = b.id AND p.payer_name IS NULL;
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.payments_upsert_booking_voucher(_booking_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; prov text; pid uuid; key text; bids uuid[];
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL OR b.external_booking_ref IS NULL OR btrim(b.external_booking_ref) = '' THEN RETURN NULL; END IF;
  prov := CASE upper(coalesce(b.source_channel, '')) WHEN 'VIATOR' THEN 'viator' WHEN 'GETYOURGUIDE' THEN 'getyourguide' WHEN 'BOKUN' THEN 'bokun' ELSE NULL END;
  IF prov IS NULL THEN RETURN NULL; END IF;
  key := 'voucher:' || prov || ':' || btrim(b.external_booking_ref);
  SELECT id INTO pid FROM public.payment_records WHERE idempotency_key = key;
  IF pid IS NULL THEN
    INSERT INTO public.payment_records(idempotency_key, provider, kind, environment, external_reference, payer_name, payer_email,
        amount, currency, event_at, source_table, metadata)
    VALUES (key, prov, 'voucher', 'live', btrim(b.external_booking_ref), b.customer_name, lower(b.customer_email),
        NULLIF(coalesce(NULLIF(b.amount_paid, 0), b.amount_total), 0), lower(b.currency), b.created_at, 'bookings',
        jsonb_build_object('amount_source', 'booking record (partner voucher)'))
    RETURNING id INTO pid;
    INSERT INTO public.payment_match_log(payment_id, action, new_status, reason)
      VALUES (pid, 'backfill_created', 'unmatched', format('%s voucher %s', prov, b.external_booking_ref));
  END IF;
  SELECT array_agg(id) INTO bids FROM public.bookings WHERE btrim(external_booking_ref) = btrim(b.external_booking_ref) AND upper(coalesce(source_channel,'')) = upper(b.source_channel);
  PERFORM public.payments_autolink(pid, bids, 'Booking carries this exact partner voucher reference');
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.payments_backfill()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text; bid uuid; before_n int; after_n int;
BEGIN
  SELECT count(*) INTO before_n FROM public.payment_records;
  FOR s IN SELECT DISTINCT session_id FROM public.stripe_webhook_events
     WHERE event_type = 'checkout.session.completed' AND payment_status = 'paid' AND verified AND session_id LIKE 'cs\_%' LOOP
    PERFORM public.payments_upsert_stripe_session(s);
  END LOOP;
  FOR bid IN SELECT id FROM public.bookings WHERE external_booking_ref IS NOT NULL LOOP
    PERFORM public.payments_upsert_booking_voucher(bid);
  END LOOP;
  SELECT count(*) INTO after_n FROM public.payment_records;
  RETURN jsonb_build_object('before', before_n, 'after', after_n, 'created', after_n - before_n);
END $$;

-- Ongoing ingestion: never let reconciliation break a webhook or booking write.
CREATE OR REPLACE FUNCTION public.payments_on_stripe_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.event_type = 'checkout.session.completed' AND NEW.payment_status = 'paid' AND NEW.verified AND NEW.session_id LIKE 'cs\_%' THEN
    BEGIN PERFORM public.payments_upsert_stripe_session(NEW.session_id);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'payments_on_stripe_event: %', SQLERRM; END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payments_on_stripe_event ON public.stripe_webhook_events;
CREATE TRIGGER payments_on_stripe_event AFTER INSERT ON public.stripe_webhook_events FOR EACH ROW EXECUTE FUNCTION public.payments_on_stripe_event();

CREATE OR REPLACE FUNCTION public.payments_on_booking_ref()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.stripe_session_id LIKE 'cs\_%' THEN PERFORM public.payments_upsert_stripe_session(NEW.stripe_session_id); END IF;
    IF NEW.external_booking_ref IS NOT NULL THEN PERFORM public.payments_upsert_booking_voucher(NEW.id); END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'payments_on_booking_ref: %', SQLERRM; END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payments_on_booking_ref ON public.bookings;
CREATE TRIGGER payments_on_booking_ref AFTER INSERT OR UPDATE OF stripe_session_id, external_booking_ref, source_channel ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.payments_on_booking_ref();

-- Admin actions (audited, atomic).
CREATE OR REPLACE FUNCTION public.ops_payment_match(_payment_id uuid, _booking_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_records;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = _booking_id) THEN RAISE EXCEPTION 'Booking not found'; END IF;
  SELECT * INTO p FROM public.payment_records WHERE id = _payment_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF p.booking_id = _booking_id THEN RETURN; END IF;
  UPDATE public.payment_records SET booking_id = _booking_id, suggested_booking_id = NULL, match_status = 'matched',
    match_confidence = 1, match_reason = coalesce(_reason, 'Matched by admin'), matched_by = auth.uid(), matched_at = now() WHERE id = p.id;
  INSERT INTO public.payment_match_log(payment_id, action, previous_status, new_status, previous_booking_id, booking_id, confidence, reason, actor_user_id)
    VALUES (p.id, 'match', p.match_status, 'matched', p.booking_id, _booking_id, 1, coalesce(_reason, 'Matched by admin'), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.ops_payment_unmatch(_payment_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_records;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.payment_records WHERE id = _payment_id FOR UPDATE;
  IF p.id IS NULL OR p.match_status <> 'matched' THEN RETURN; END IF;
  UPDATE public.payment_records SET booking_id = NULL, match_status = 'unmatched', match_confidence = NULL,
    match_reason = coalesce(_reason, 'Match undone by admin'), matched_by = NULL, matched_at = NULL WHERE id = p.id;
  INSERT INTO public.payment_match_log(payment_id, action, previous_status, new_status, previous_booking_id, reason, actor_user_id)
    VALUES (p.id, 'undo', 'matched', 'unmatched', p.booking_id, coalesce(_reason, 'Match undone by admin'), auth.uid());
END $$;

-- Matcher output: only ever moves unmatched/suggested/needs_review rows; never links.
CREATE OR REPLACE FUNCTION public.ops_payment_set_suggestion(_payment_id uuid, _status text, _booking_id uuid, _confidence numeric, _reason text, _candidates jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_records;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF _status NOT IN ('unmatched','suggested','needs_review') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO p FROM public.payment_records WHERE id = _payment_id FOR UPDATE;
  IF p.id IS NULL OR p.match_status = 'matched' THEN RETURN false; END IF;
  IF p.match_status = _status AND p.suggested_booking_id IS NOT DISTINCT FROM _booking_id AND p.match_candidates = coalesce(_candidates, '[]'::jsonb) THEN RETURN false; END IF;
  UPDATE public.payment_records SET match_status = _status, suggested_booking_id = CASE WHEN _status = 'suggested' THEN _booking_id END,
    match_confidence = _confidence, match_reason = _reason, match_candidates = coalesce(_candidates, '[]'::jsonb) WHERE id = p.id;
  INSERT INTO public.payment_match_log(payment_id, action, previous_status, new_status, booking_id, confidence, reason, actor_user_id)
    VALUES (p.id, _status::text, p.match_status, _status, _booking_id, _confidence, _reason, auth.uid());
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.payments_autolink(uuid, uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_upsert_stripe_session(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_upsert_booking_voucher(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_backfill() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_on_stripe_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payments_on_booking_ref() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_payment_match(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_payment_unmatch(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_payment_set_suggestion(uuid, text, uuid, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_payment_match(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_payment_unmatch(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_payment_set_suggestion(uuid, text, uuid, numeric, text, jsonb) TO authenticated;

SELECT public.payments_backfill();
