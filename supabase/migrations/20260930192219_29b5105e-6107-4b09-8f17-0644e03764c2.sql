CREATE UNIQUE INDEX IF NOT EXISTS booking_repair_log_review_once
  ON public.booking_repair_log(booking_id, field, note) WHERE outcome = 'needs_review';
CREATE OR REPLACE FUNCTION public.normalize_booking_details()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bd jsonb := coalesce(NEW.booking_details, '{}'::jsonb); s jsonb; md jsonb := coalesce(NEW.metadata, '{}'::jsonb);
  pl jsonb := '{}'::jsonb; r record; batch text := CASE WHEN TG_OP = 'INSERT' THEN 'ingest-normalizer' ELSE 'phase1b-normalizer' END;
  f text; vals text[]; src text;
BEGIN
  s := CASE WHEN jsonb_typeof(bd->'snapshot') = 'object' THEN bd->'snapshot' ELSE bd END;
  IF NEW.stripe_session_id IS NOT NULL THEN
    SELECT payload INTO pl FROM public.booking_snapshots WHERE stripe_session_id = NEW.stripe_session_id ORDER BY created_at DESC LIMIT 1;
    pl := coalesce(pl, '{}'::jsonb);
  END IF;
  FOREACH f IN ARRAY ARRAY['pickup_location','preferred_date','source_tour_id','tour_title'] LOOP
    IF f = 'pickup_location' AND nullif(btrim(coalesce(NEW.pickup_location,'')),'') IS NULL THEN
      vals := ARRAY[s->>'pickup', pl->>'pickup', md->>'pickup']; src := 'booking_details.pickup|snapshot.pickup|metadata.pickup';
    ELSIF f = 'preferred_date' AND NEW.preferred_date IS NULL THEN
      vals := ARRAY[s->>'dateExact', pl->>'dateExact', md->>'date_exact']; src := 'booking_details.dateExact|snapshot.dateExact|metadata.date_exact';
      vals := ARRAY(SELECT x FROM unnest(vals) x WHERE x ~ '^\d{4}-\d{2}-\d{2}$');
    ELSIF f = 'source_tour_id' AND nullif(btrim(coalesce(NEW.source_tour_id,'')),'') IS NULL THEN
      vals := ARRAY[s->>'tourId', pl->>'tourId', md->>'tour_id']; src := 'booking_details.tourId|snapshot.tourId|metadata.tour_id';
    ELSIF f = 'tour_title' AND nullif(btrim(coalesce(NEW.tour_title,'')),'') IS NULL THEN
      vals := ARRAY[s->>'tourTitle', pl->>'tourTitle']; src := 'booking_details.tourTitle|snapshot.tourTitle';
    ELSE CONTINUE; END IF;
    SELECT * INTO r FROM public.booking_pick_single(vals);
    IF r.conflict THEN
      INSERT INTO public.booking_repair_log(booking_id, repair_batch, field, source, outcome, note)
      VALUES (NEW.id, batch, f, src, 'needs_review', 'sources disagree: ' || array_to_string(vals, ' | '))
      ON CONFLICT DO NOTHING;
    ELSIF r.picked IS NOT NULL THEN
      IF f = 'pickup_location' THEN NEW.pickup_location := r.picked;
      ELSIF f = 'preferred_date' THEN NEW.preferred_date := r.picked::date;
      ELSIF f = 'source_tour_id' THEN NEW.source_tour_id := r.picked;
      ELSE NEW.tour_title := r.picked; END IF;
      INSERT INTO public.booking_repair_log(booking_id, repair_batch, field, old_value, new_value, source, note)
      VALUES (NEW.id, batch, f, NULL, r.picked, src, r.sources || ' agreeing source(s)');
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.normalize_booking_details() FROM PUBLIC, anon, authenticated;