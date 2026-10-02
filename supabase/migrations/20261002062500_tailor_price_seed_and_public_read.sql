-- Make Tailor pricing reproducible from Git and restrict public reads to
-- customer-bookable data. Existing Admin edits win: seeds never overwrite rows.

INSERT INTO public.tailor_price_policies
  (policy_group, max_total_pct, floor_pct_of_base, note)
VALUES
  ('principal_removal', 0.15, 0.70, 'Approved Tailor principal-removal ladder: 5% per priced principal stop, capped at 15%, floor 70% of base.')
ON CONFLICT (policy_group) DO NOTHING;

-- Approved principal removals: 5% each. Direction carries the sign.
INSERT INTO public.tailor_price_rules
  (tour_id, action_id, action_kind, direction, label, default_in_day,
   adjustment_type, adjustment_value, unit, policy_group, active)
VALUES
  ('arrabida-wine-allinclusive','stop:livramento','stop','remove','Remove Mercado do Livramento',true,'percent',5,'per_person','principal_removal',true),
  ('arrabida-wine-allinclusive','stop:azeitao-tiles','stop','remove','Remove Azulejos de Azeitão tile factory',true,'percent',5,'per_person','principal_removal',true),
  ('wild-beaches-picnic','stop:livramento','stop','remove','Remove Mercado do Livramento',true,'percent',5,'per_person','principal_removal',true),
  ('arrabida-boat','stop:livramento','stop','remove','Remove Mercado do Livramento',true,'percent',5,'per_person','principal_removal',true),
  ('tiles-workshop','stop:livramento','stop','remove','Remove Mercado do Livramento',true,'percent',5,'per_person','principal_removal',true),
  ('tiles-workshop','stop:lunch-azeitao','stop','remove','Remove lunch in Azeitão',true,'percent',5,'per_person','principal_removal',true),
  ('azeitao-cheese','stop:livramento','stop','remove','Remove Mercado do Livramento',true,'percent',5,'per_person','principal_removal',true),
  ('azeitao-cheese','stop:lunch-azeitao','stop','remove','Remove lunch in Azeitão',true,'percent',5,'per_person','principal_removal',true),
  ('sintra-cascais','stop:lunch-azenhas','stop','remove','Remove lunch at Azenhas do Mar',true,'percent',5,'per_person','principal_removal',true),
  ('troia-comporta','stop:troia-ruins','stop','remove','Remove Roman Ruins of Tróia',true,'percent',5,'per_person','principal_removal',true),
  ('troia-comporta','stop:herdade-comporta','stop','remove','Remove Comporta winery visit',true,'percent',5,'per_person','principal_removal',true),
  ('troia-comporta','stop:comporta-lunch','stop','remove','Remove lunch in Comporta',true,'percent',5,'per_person','principal_removal',true),
  ('evora-alentejo','stop:templo-romano','stop','remove','Remove Roman Temple of Évora',true,'percent',5,'per_person','principal_removal',true),
  ('evora-alentejo','stop:chapel-of-bones','stop','remove','Remove Chapel of Bones',true,'percent',5,'per_person','principal_removal',true),
  ('evora-alentejo','stop:evora-lunch','stop','remove','Remove Alentejo lunch',true,'percent',5,'per_person','principal_removal',true),
  ('tomar-coimbra','stop:convento-cristo','stop','remove','Remove Convento de Cristo',true,'percent',5,'per_person','principal_removal',true),
  ('tomar-coimbra','stop:tomar-lunch','stop','remove','Remove lunch en route',true,'percent',5,'per_person','principal_removal',true),
  ('tomar-coimbra','stop:coimbra-uni','stop','remove','Remove University of Coimbra',true,'percent',5,'per_person','principal_removal',true),
  ('tomar-coimbra','stop:biblioteca-joanina','stop','remove','Remove Biblioteca Joanina',true,'percent',5,'per_person','principal_removal',true),
  ('fatima-nazare-obidos','stop:fatima','stop','remove','Remove Sanctuary of Fátima',true,'percent',5,'per_person','principal_removal',true),
  ('fatima-nazare-obidos','stop:nazare-lunch','stop','remove','Remove lunch in Nazaré',true,'percent',5,'per_person','principal_removal',true),
  ('roman-heritage-alentejo','stop:sao-cucufate','stop','remove','Remove Villa Romana de São Cucufate',true,'percent',5,'per_person','principal_removal',true),
  ('roman-heritage-alentejo','stop:vinho-talha','stop','remove','Remove Talha wine interpretation visit',true,'percent',5,'per_person','principal_removal',true),
  ('roman-heritage-alentejo','stop:mestre-daniel','stop','remove','Remove artisan winery visit',true,'percent',5,'per_person','principal_removal',true),
  ('roman-heritage-alentejo','stop:talha-lunch','stop','remove','Remove Alentejo lunch',true,'percent',5,'per_person','principal_removal',true)
ON CONFLICT (tour_id, action_id, direction) DO NOTHING;

-- Approved zero-price removals: free descriptive/viewpoint moments.
INSERT INTO public.tailor_price_rules
  (tour_id, action_id, action_kind, direction, label, default_in_day,
   adjustment_type, adjustment_value, unit, policy_group, active)
VALUES
  ('arrabida-wine-allinclusive','stop:arrabida-park','stop','remove','Remove Parque Natural da Arrábida viewpoint',true,'fixed_eur',0,'per_person',null,true),
  ('wild-beaches-picnic','stop:arrabida-drive','stop','remove','Remove Arrábida coastal drive',true,'fixed_eur',0,'per_person',null,true),
  ('arrabida-boat','stop:arrabida-drive','stop','remove','Remove Arrábida coastal viewpoints',true,'fixed_eur',0,'per_person',null,true),
  ('sintra-cascais','stop:cabo-da-roca','stop','remove','Remove Cabo da Roca',true,'fixed_eur',0,'per_person',null,true),
  ('fatima-nazare-obidos','stop:nazare-beach','stop','remove','Remove Nazaré cliffs and beach',true,'fixed_eur',0,'per_person',null,true),
  ('roman-heritage-alentejo','stop:vila-alva','stop','remove','Remove Vila Alva drive',true,'fixed_eur',0,'per_person',null,true)
ON CONFLICT (tour_id, action_id, direction) DO NOTHING;

-- Approved flat Tailor additions/removals.
INSERT INTO public.tailor_price_rules
  (tour_id, action_id, action_kind, direction, label, default_in_day,
   adjustment_type, adjustment_value, unit, policy_group, active)
VALUES
  ('troia-comporta','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('arrabida-boat','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('sintra-cascais','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('azeitao-cheese','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('tomar-coimbra','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('evora-alentejo','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('fatima-nazare-obidos','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('tiles-workshop','lunch','lunch','add','Add restaurant lunch',false,'fixed_eur',35,'per_person',null,true),
  ('arrabida-wine-allinclusive','stop:lunch-azeitao','stop','remove','Remove included lunch',true,'fixed_eur',15,'per_person',null,true),
  ('arrabida-wine-allinclusive','choice-3','choice_slot','add','Add winery visit 3',false,'fixed_eur',20,'per_person',null,true),
  ('arrabida-wine-allinclusive','choice-4','choice_slot','add','Add winery visit 4',false,'fixed_eur',20,'per_person',null,true),
  ('evora-alentejo','choice-3','choice_slot','add','Add winery visit 3',false,'fixed_eur',25,'per_person',null,true)
ON CONFLICT (tour_id, action_id, direction) DO NOTHING;

-- Public clients only need bookable rows and customer-facing pricing columns.
DROP POLICY IF EXISTS "Anyone can read Tailor prices" ON public.tailor_price_rules;

REVOKE SELECT ON public.tailor_price_rules FROM anon;
GRANT SELECT (
  tour_id, action_id, action_kind, direction, label, default_in_day,
  adjustment_type, adjustment_value, unit, policy_group, active,
  min_party, max_party
) ON public.tailor_price_rules TO anon;

CREATE POLICY "Public reads bookable Tailor prices"
ON public.tailor_price_rules
FOR SELECT
TO anon
USING (active = true AND adjustment_value IS NOT NULL);

CREATE POLICY "Authenticated reads Tailor prices"
ON public.tailor_price_rules
FOR SELECT
TO authenticated
USING (
  (active = true AND adjustment_value IS NOT NULL)
  OR public.has_role(auth.uid(), 'admin')
);

-- Public clients need policy math, not internal notes/audit columns.
REVOKE SELECT ON public.tailor_price_policies FROM anon;
GRANT SELECT (policy_group, max_total_pct, floor_pct_of_base)
ON public.tailor_price_policies TO anon;
