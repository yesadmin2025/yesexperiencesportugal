-- Tailor Price Map: least-privilege grants for public clients.
-- RLS already blocks anonymous writes, but anon does not need DML/table privileges
-- at all. Keep only the exact customer-safe SELECT columns.

REVOKE ALL PRIVILEGES ON public.tailor_price_rules FROM anon;
GRANT SELECT (
  tour_id, action_id, action_kind, direction, label, default_in_day,
  adjustment_type, adjustment_value, unit, policy_group, active,
  min_party, max_party
) ON public.tailor_price_rules TO anon;

REVOKE ALL PRIVILEGES ON public.tailor_price_policies FROM anon;
GRANT SELECT (
  policy_group, max_total_pct, floor_pct_of_base
) ON public.tailor_price_policies TO anon;
