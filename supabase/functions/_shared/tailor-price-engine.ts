// Tailor price engine — PURE, dependency-free.
//
// THIS FILE IS MIRRORED BYTE-FOR-BYTE at
// supabase/functions/_shared/tailor-price-engine.ts so the browser and the
// payment server compute every euro with the same code. A test fails if the
// two copies differ. Prices come only from `tailor_price_rules` /
// `tailor_price_policies` rows (admin-edited); nothing here holds a price.

export type TailorDirection = "add" | "remove";
export type TailorAdjustmentType = "fixed_eur" | "percent";
export type TailorUnit = "per_person" | "per_group" | "per_vehicle" | "flat";
export type TailorAgeBand = "adult" | "youth" | "child" | "infant";

export interface TailorPriceRule {
  tour_id: string;
  action_id: string;
  action_kind: string;
  direction: TailorDirection;
  adjustment_type: TailorAdjustmentType;
  /** null = Missing price (never bookable). 0 = intentional no change. */
  adjustment_value: number | null;
  unit: TailorUnit;
  policy_group: string | null;
  active: boolean;
  min_party: number | null;
  max_party: number | null;
  label?: string | null;
}

export interface TailorPricePolicy {
  policy_group: string;
  max_total_pct: number;
  floor_pct_of_base: number;
}

export interface TailorSelectedAction {
  actionId: string;
  direction: TailorDirection;
}

export interface TailorLedgerLine {
  actionId: string;
  direction: TailorDirection;
  label: string;
  amountEur: number;
}

export type TailorPriceResult =
  | {
      ok: true;
      baseTotalEur: number;
      adultUnitEur: number;
      minorUnits: { age: number; band: TailorAgeBand; unitEur: number }[];
      groupFixedEur: number;
      totalEur: number;
      lines: TailorLedgerLine[];
    }
  | { ok: false; code: "unknown_action" | "duplicate_action" | "unpriced_action" | "inactive_action" | "party_out_of_range" | "invalid_sequence" | "invalid_base"; actionId?: string };

export const TAILOR_AGE_BAND_PCT: Record<TailorAgeBand, number> = {
  adult: 1,
  youth: 0.75,
  child: 0.5,
  infant: 0,
};

export const TAILOR_VEHICLE_CAPACITY = 8;

export function tailorRuleKey(actionId: string, direction: TailorDirection): string {
  return `${actionId}::${direction}`;
}

/** A rule is customer-bookable only when active AND explicitly priced. */
export function tailorRuleBookable(rule: TailorPriceRule | undefined, headcount?: number): boolean {
  if (!rule || !rule.active) return false;
  if (rule.adjustment_value === null || rule.adjustment_value === undefined) return false;
  if (!Number.isFinite(Number(rule.adjustment_value))) return false;
  if (headcount !== undefined) {
    if (rule.min_party != null && headcount < rule.min_party) return false;
    if (rule.max_party != null && headcount > rule.max_party) return false;
  }
  return true;
}

function choiceIndex(actionId: string): number | null {
  const m = /^choice-(\d+)$/.exec(actionId);
  return m ? Number(m[1]) : null;
}

function signed(rule: TailorPriceRule): number {
  const v = Number(rule.adjustment_value);
  return rule.direction === "remove" ? -v : v;
}

/**
 * Compute the authoritative Tailor total.
 *   total = base party price (tiers + age bands)
 *         + percent changes (capped and floored by their policy)
 *         + fixed per-person changes (age-banded like the base)
 *         + fixed per-group / per-vehicle / flat changes
 */
export function computeTailorPrice(input: {
  basePerPaxEur: number;
  adults: number;
  minorAges: number[];
  ageBand: (age: number) => TailorAgeBand | null;
  rules: readonly TailorPriceRule[];
  policies: readonly TailorPricePolicy[];
  selected: readonly TailorSelectedAction[];
}): TailorPriceResult {
  const { basePerPaxEur, adults, minorAges, rules, policies, selected } = input;
  if (!Number.isFinite(basePerPaxEur) || basePerPaxEur <= 0 || adults < 1) {
    return { ok: false, code: "invalid_base" };
  }
  const headcount = adults + minorAges.length;
  const byKey = new Map<string, TailorPriceRule>();
  for (const r of rules) byKey.set(tailorRuleKey(r.action_id, r.direction), r);

  const seen = new Set<string>();
  const picked: TailorPriceRule[] = [];
  for (const a of selected) {
    const key = tailorRuleKey(a.actionId, a.direction);
    if (seen.has(key) || seen.has(a.actionId)) return { ok: false, code: "duplicate_action", actionId: a.actionId };
    seen.add(key);
    seen.add(a.actionId);
    const rule = byKey.get(key);
    if (!rule) return { ok: false, code: "unknown_action", actionId: a.actionId };
    if (!rule.active) return { ok: false, code: "inactive_action", actionId: a.actionId };
    if (rule.adjustment_value === null || !Number.isFinite(Number(rule.adjustment_value))) {
      return { ok: false, code: "unpriced_action", actionId: a.actionId };
    }
    if (!tailorRuleBookable(rule, headcount)) return { ok: false, code: "party_out_of_range", actionId: a.actionId };
    picked.push(rule);
  }

  // Choice slots must be contiguous: removals peel off from the top of the
  // included count, additions stack from just above it, never both.
  const choiceRemovals = picked.filter((r) => r.direction === "remove" && choiceIndex(r.action_id) !== null);
  const choiceAdds = picked.filter((r) => r.direction === "add" && choiceIndex(r.action_id) !== null);
  if (choiceRemovals.length && choiceAdds.length) return { ok: false, code: "invalid_sequence" };
  const allRemoveSlots = rules
    .filter((r) => r.direction === "remove" && choiceIndex(r.action_id) !== null)
    .map((r) => choiceIndex(r.action_id)!)
    .sort((a, b) => b - a);
  const allAddSlots = rules
    .filter((r) => r.direction === "add" && choiceIndex(r.action_id) !== null)
    .map((r) => choiceIndex(r.action_id)!)
    .sort((a, b) => a - b);
  const pickedRemove = new Set(choiceRemovals.map((r) => choiceIndex(r.action_id)!));
  const pickedAdd = new Set(choiceAdds.map((r) => choiceIndex(r.action_id)!));
  for (let i = 0; i < pickedRemove.size; i++) if (!pickedRemove.has(allRemoveSlots[i])) return { ok: false, code: "invalid_sequence" };
  for (let i = 0; i < pickedAdd.size; i++) if (!pickedAdd.has(allAddSlots[i])) return { ok: false, code: "invalid_sequence" };

  // Percent changes, grouped by policy (cap + floor are data, not code).
  const policyByGroup = new Map(policies.map((p) => [p.policy_group, p]));
  let pctTotal = 0;
  let floorPct = 0;
  const pctByGroup = new Map<string, number>();
  for (const r of picked) {
    if (r.adjustment_type !== "percent") continue;
    const g = r.policy_group ?? "__default__";
    pctByGroup.set(g, (pctByGroup.get(g) ?? 0) + signed(r) / 100);
  }
  for (const [g, pct] of pctByGroup) {
    const pol = policyByGroup.get(g);
    const cap = pol ? Number(pol.max_total_pct) : 1;
    pctTotal += Math.max(-cap, Math.min(cap, pct));
    if (pol) floorPct = Math.max(floorPct, Number(pol.floor_pct_of_base));
  }
  let reducedPerPax = Math.round(basePerPaxEur * (1 + pctTotal));
  if (pctByGroup.size > 0) reducedPerPax = Math.max(reducedPerPax, Math.round(basePerPaxEur * floorPct));
  else reducedPerPax = basePerPaxEur;

  let perPersonFixed = 0;
  let groupFixedEur = 0;
  const vehicles = Math.max(1, Math.ceil(headcount / TAILOR_VEHICLE_CAPACITY));
  for (const r of picked) {
    if (r.adjustment_type !== "fixed_eur") continue;
    const v = Math.round(signed(r));
    if (r.unit === "per_person") perPersonFixed += v;
    else if (r.unit === "per_vehicle") groupFixedEur += v * vehicles;
    else groupFixedEur += v;
  }

  const adultUnitEur = Math.max(0, reducedPerPax + perPersonFixed);
  const minorUnits: { age: number; band: TailorAgeBand; unitEur: number }[] = [];
  let personsTotal = adults * adultUnitEur;
  let baseTotalEur = adults * basePerPaxEur;
  for (const age of minorAges) {
    const band = input.ageBand(age);
    if (!band) return { ok: false, code: "invalid_base" };
    const unitEur = Math.round(adultUnitEur * TAILOR_AGE_BAND_PCT[band]);
    minorUnits.push({ age, band, unitEur });
    personsTotal += unitEur;
    baseTotalEur += Math.round(basePerPaxEur * TAILOR_AGE_BAND_PCT[band]);
  }
  const totalEur = Math.max(0, personsTotal + groupFixedEur);

  // Ledger: only price-changing lines; rounding residue folds into the
  // largest line so the lines always sum to the exact total.
  const weight = adults + minorAges.reduce((s, a) => s + TAILOR_AGE_BAND_PCT[input.ageBand(a) ?? "adult"], 0);
  const lines: TailorLedgerLine[] = [];
  for (const r of picked) {
    let amount = 0;
    if (r.adjustment_type === "percent") {
      const g = r.policy_group ?? "__default__";
      const groupRaw = pctByGroup.get(g) ?? 0;
      const share = groupRaw === 0 ? 0 : (signed(r) / 100) / groupRaw;
      amount = Math.round((reducedPerPax - basePerPaxEur) * weight * share);
    } else if (r.unit === "per_person") amount = Math.round(signed(r) * weight);
    else if (r.unit === "per_vehicle") amount = Math.round(signed(r)) * vehicles;
    else amount = Math.round(signed(r));
    if (amount === 0) continue;
    lines.push({ actionId: r.action_id, direction: r.direction, label: r.label ?? r.action_id, amountEur: amount });
  }
  const residue = totalEur - baseTotalEur - lines.reduce((s, l) => s + l.amountEur, 0);
  if (residue !== 0) {
    if (lines.length) {
      let idx = 0;
      for (let i = 1; i < lines.length; i++) if (Math.abs(lines[i].amountEur) > Math.abs(lines[idx].amountEur)) idx = i;
      lines[idx] = { ...lines[idx], amountEur: lines[idx].amountEur + residue };
    } else baseTotalEur += residue;
  }

  return { ok: true, baseTotalEur, adultUnitEur, minorUnits, groupFixedEur, totalEur, lines };
}
