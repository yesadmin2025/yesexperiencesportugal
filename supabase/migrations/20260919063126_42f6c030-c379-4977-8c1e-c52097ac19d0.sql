UPDATE public.studio_composable_stops AS c
SET duration_minutes = v.duration,
    open_from = v.open_from::time,
    open_to = v.open_to::time,
    notes = COALESCE(NULLIF(c.notes, ''), '') ||
      CASE WHEN COALESCE(c.notes, '') = '' THEN '' ELSE ' · ' END ||
      'Duração de fonte verificada Signature; janela de dia privado genérica — confirmar horário com fornecedor.',
    updated_at = now()
FROM (VALUES
  ('adega-cooperativa-palmela', 75, '09:30', '18:00'),
  ('adega-mestre-daniel-xxvi-talhas', 90, '09:30', '18:00'),
  ('adega-regional-de-colares', 60, '09:30', '18:00'),
  ('arrabida-bay-boat', 150, '09:30', '18:00'),
  ('azulejos-painting-workshop', 90, '09:30', '18:00'),
  ('bacalhoa-vinhos-de-portugal', 75, '09:30', '18:00'),
  ('biblioteca-joanina', 30, '09:30', '18:00'),
  ('convento-de-cristo', 75, '09:30', '18:00'),
  ('herdade-da-comporta', 75, '09:30', '18:00'),
  ('jose-maria-da-fonseca', 75, '09:30', '18:00'),
  ('lunch-azeitao-table', 75, '12:00', '15:00'),
  ('lunch-azenhas-table', 60, '12:00', '15:00'),
  ('lunch-comporta-table', 60, '12:00', '15:00'),
  ('lunch-nazare-table', 60, '12:00', '15:00'),
  ('lunch-talha-table', 75, '12:00', '15:00'),
  ('lunch-tomar-table', 60, '12:00', '15:00'),
  ('pena-palace', 90, '09:30', '18:00'),
  ('pera-grave-peramanca', 75, '09:30', '18:00'),
  ('quinta-da-regaleira', 75, '09:30', '18:00'),
  ('quinta-de-catralvos', 75, '09:30', '18:00'),
  ('quinta-do-piloto', 75, '09:30', '18:00'),
  ('quinta-velha-cheese-workshop', 75, '09:30', '18:00'),
  ('roman-ruins-troia', 45, '09:30', '18:00'),
  ('sintra-national-palace', 60, '09:30', '18:00')
) AS v(stop_id, duration, open_from, open_to)
WHERE c.stop_id = v.stop_id
  AND c.active
  AND (c.duration_minutes IS NULL OR c.open_from IS NULL OR c.open_to IS NULL);

UPDATE public.studio_composable_stops
SET duration_options_minutes = ARRAY[duration_minutes]::integer[],
    updated_at = now()
WHERE active
  AND duration_minutes IS NOT NULL
  AND COALESCE(array_length(duration_options_minutes, 1), 0) = 0;

UPDATE public.studio_composable_stops
SET quantity_options = ARRAY[1]::integer[],
    updated_at = now()
WHERE active
  AND COALESCE(array_length(quantity_options, 1), 0) = 0;