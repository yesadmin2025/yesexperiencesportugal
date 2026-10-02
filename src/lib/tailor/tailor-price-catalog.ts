// Tailor action catalog — which changes a Signature structurally OFFERS.
//
// Derived from the Tailor blueprints (structural truth). It holds NO prices:
// prices live only in `tailor_price_rules`. Used by:
//   • the seed generator (one rule row per offered direction),
//   • Admin completeness (only offered directions count),
//   • the Tailor page (an action is interactive only if offered AND priced).

import { TAILOR_BLUEPRINTS, type BlueprintStop } from "@/data/tailorBlueprints";
import { tailorRules } from "@/data/tailorRules";
import type { TailorDirection } from "./tailor-price-engine";

export type TailorActionKind = "stop" | "choice_slot" | "lunch" | "optional";

export interface TailorOfferedAction {
  tourId: string;
  actionId: string;
  kind: TailorActionKind;
  direction: TailorDirection;
  label: string;
  /** True when the item is part of the day before the guest edits it. */
  defaultInDay: boolean;
}

/** Same rule the Tailor page applies: transfer locks are removable. */
export function catalogStopRemovable(s: BlueprintStop): boolean {
  return !s.lock || s.lock.reasonCode === "mandatory_transfer";
}

export const stopActionId = (stopId: string) => `stop:${stopId}`;
export const optionalActionId = (stopId: string) => `optional:${stopId}`;
export const choiceSlotId = (n: number) => `choice-${n}`;
export const LUNCH_ACTION_ID = "lunch";

/** Effective max picks for a choice pool (winery rules may cap lower). */
export function choiceMax(tourId: string): number {
  const bp = TAILOR_BLUEPRINTS[tourId];
  if (!bp?.choice) return 0;
  const w = tailorRules(tourId).wineries;
  return w
    ? Math.min(w.max, bp.choice.options.length)
    : Math.min(bp.choice.pickMax, bp.choice.options.length);
}

export function tailorOfferedActions(tourId: string): TailorOfferedAction[] {
  const bp = TAILOR_BLUEPRINTS[tourId];
  if (!bp) return [];
  const out: TailorOfferedAction[] = [];
  for (const s of bp.core) {
    if (!catalogStopRemovable(s)) continue;
    out.push({
      tourId,
      actionId: stopActionId(s.id),
      kind: "stop",
      direction: "remove",
      label: `Remove ${s.label}`,
      defaultInDay: true,
    });
  }
  if (bp.choice) {
    const noun = bp.choice.options.every((o) => o.category === "winery") ? "winery" : "choice";
    for (let n = bp.choice.pickMin; n >= 1; n--) {
      out.push({
        tourId,
        actionId: choiceSlotId(n),
        kind: "choice_slot",
        direction: "remove",
        label:
          noun === "winery"
            ? `${n - 1} ${n - 1 === 1 ? "winery" : "wineries"} instead of ${n}`
            : `${n - 1} selected instead of ${n} — ${bp.choice.label}`,
        defaultInDay: true,
      });
    }
    for (let n = bp.choice.pickMin + 1; n <= choiceMax(tourId); n++) {
      out.push({
        tourId,
        actionId: choiceSlotId(n),
        kind: "choice_slot",
        direction: "add",
        label: noun === "winery" ? `Winery number ${n}` : `Choice number ${n}`,
        defaultInDay: false,
      });
    }
  }
  if (tailorRules(tourId).allowAddLunch) {
    out.push({
      tourId,
      actionId: LUNCH_ACTION_ID,
      kind: "lunch",
      direction: "add",
      label: "Add restaurant lunch",
      defaultInDay: false,
    });
  }
  for (const o of bp.optional) {
    out.push({
      tourId,
      actionId: optionalActionId(o.id),
      kind: "optional",
      direction: "add",
      label: `Add ${o.label}`,
      defaultInDay: false,
    });
  }
  return out;
}

export function allTailorOfferedActions(): TailorOfferedAction[] {
  return Object.keys(TAILOR_BLUEPRINTS).flatMap(tailorOfferedActions);
}
