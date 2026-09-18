insert into public.tour_operating_rules (tour_id, weekdays, blackout_dates, min_lead_hours)
values
  ('arrabida-wine-allinclusive', '{0,1,2,3,4,5,6}', '{}', 24),
  ('wild-beaches-picnic',        '{0,1,2,3,4,5,6}', '{}', 24),
  ('arrabida-boat',              '{0,1,2,3,4,5,6}', '{}', 24),
  ('tiles-workshop',             '{0,1,2,3,4,5,6}', '{}', 24),
  ('azeitao-cheese',             '{0,1,2,3,4,5,6}', '{}', 24),
  ('sintra-cascais',             '{0,1,2,3,4,5,6}', '{}', 24),
  ('troia-comporta',             '{0,1,2,3,4,5,6}', '{}', 24),
  ('evora-alentejo',             '{0,1,2,3,4,5,6}', '{}', 24),
  ('tomar-coimbra',              '{0,1,2,3,4,5,6}', '{}', 24),
  ('fatima-nazare-obidos',       '{0,1,2,3,4,5,6}', '{}', 24),
  ('roman-heritage-alentejo',    '{0,1,2,3,4,5,6}', '{}', 24),
  ('southwest-vicentine-coast',  '{0,1,2,3,4,5,6}', '{}', 24)
on conflict (tour_id) do nothing;