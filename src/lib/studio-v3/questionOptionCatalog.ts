/**
 * BUILD 2 — Pass 2. Closed director option catalogue.
 *
 * LEAF MODULE. It contains static metadata only and MUST NOT import
 * `adaptiveQuestions`, `studioQuestionDirector`, `directorContext`,
 * `questionUncertainty`, capability / reachability / publicRefinementPaths.
 *
 * `LEGACY_REFINEMENT_SIGNAL_MIRROR` is a TEMPORARY PASS-2 COMPATIBILITY
 * MIRROR of `REFINEMENT_TO_SIGNAL` in `adaptiveQuestions.ts`. It is duplicated
 * deliberately (no import) and is drift-protected by a test-only parity check
 * until the live question layer is switched over in Pass 4.
 *
 * Nothing here invents a supplier, stop, price, time or activity.
 */

import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import type { TimingConflictOption } from "@/lib/studio-v3/timeDomain";

/**
 * Non-discovery tradeoff options. These resolve TIME, never content taste.
 * They mirror the REAL BUILD-1 `TimingConflictOption` action kinds one-to-one.
 * There is deliberately no generic fallback tradeoff: a tradeoff BUILD 1 did
 * not supply can never be offered.
 */
export const TRADEOFF_OPTION_IDS = [
  "time-extend-duration",
  "time-swap-moment",
  "time-choose-between-anchors",
] as const;

export type TradeoffOptionId = (typeof TRADEOFF_OPTION_IDS)[number];

/** Every option id the director may ever emit. Closed by construction. */
export type DirectorOptionId = AdaptiveRefinementId | TradeoffOptionId;

export type DirectorOptionKind = "discovery" | "tradeoff";

export type DirectorOption = {
  id: DirectorOptionId;
  kind: DirectorOptionKind;
  /**
   * Factual machine label. NOT traveller copy — AI phrasing arrives in Pass 6.
   */
  machineLabel: string;
  /** Discovery signal emitted by choosing this option, when any. */
  discoverySignal: LivingAtlasDiscoverySignal | null;
};

/**
 * PASS-2 COMPATIBILITY MIRROR of `adaptiveQuestions.REFINEMENT_TO_SIGNAL`.
 * Must stay byte-equal in meaning; enforced by the parity test.
 */
export const LEGACY_REFINEMENT_SIGNAL_MIRROR: Readonly<
  Record<AdaptiveRefinementId, LivingAtlasDiscoverySignal | null>
> = {
  "coast-from-the-water": "arrabida-from-water",
  "coast-wild-beaches": "arrabida-beach-picnic",
  "coast-clifftop-views": null,
  "coast-remote-southwest": "wild-vicentine-coast",
  "wine-cellar-depth": "arrabida-family-wine",
  "wine-table-and-cheese": "make-azeitao-cheese",
  "wine-vineyard-views": null,
  "wine-monumental-estates": "monumental-alentejo",
  "wine-clay-talha": "roman-talha-family",
  "hands-paint-tile": "paint-azulejo",
  "hands-make-cheese": "make-azeitao-cheese",
  "hands-just-watch": null,
  "local-river-and-rice": "comporta-rice-fields",
  "local-market-morning": null,
  "local-artisans": "paint-azulejo",
  "faith-sanctuary-time": "living-faith-and-coast",
  "faith-templar-heritage": "templars-and-university",
  "faith-quiet-reflection": null,
  "photo-golden-hour": null,
  "photo-landmarks": "palaces-and-atlantic",
  "photo-no-preference": null,
} as const;

const LEGACY_MACHINE_LABEL: Readonly<Record<AdaptiveRefinementId, string>> = {
  "coast-from-the-water": "coast.from-the-water",
  "coast-wild-beaches": "coast.wild-beaches",
  "coast-clifftop-views": "coast.clifftop-views",
  "coast-remote-southwest": "coast.remote-southwest",
  "wine-cellar-depth": "wine.cellar-depth",
  "wine-table-and-cheese": "wine.table-and-cheese",
  "wine-vineyard-views": "wine.vineyard-views",
  "wine-monumental-estates": "wine.monumental-estates",
  "wine-clay-talha": "wine.clay-talha",
  "hands-paint-tile": "hands.paint-tile",
  "hands-make-cheese": "hands.make-cheese",
  "hands-just-watch": "hands.just-watch",
  "local-river-and-rice": "local.river-and-rice",
  "local-market-morning": "local.market-morning",
  "local-artisans": "local.artisans",
  "faith-sanctuary-time": "faith.sanctuary-time",
  "faith-templar-heritage": "faith.templar-heritage",
  "faith-quiet-reflection": "faith.quiet-reflection",
  "photo-golden-hour": "photo.golden-hour",
  "photo-landmarks": "photo.landmarks",
  "photo-no-preference": "photo.no-preference",
};

const TRADEOFF_MACHINE_LABEL: Readonly<Record<TradeoffOptionId, string>> = {
  "time-extend-duration": "time.extend-duration",
  "time-swap-moment": "time.swap-moment",
  "time-choose-between-anchors": "time.choose-between-anchors",
};

/** BUILD-1 action kind -> closed catalog action id. Fail-closed by typing. */
export const TIMING_ACTION_OPTION_ID: Readonly<
  Record<TimingConflictOption["option"], TradeoffOptionId>
> = {
  "extend-duration": "time-extend-duration",
  "swap-moment": "time-swap-moment",
  "choose-between-anchors": "time-choose-between-anchors",
};

function buildCatalog(): Readonly<Record<DirectorOptionId, DirectorOption>> {
  const entries: Array<[DirectorOptionId, DirectorOption]> = [];
  for (const id of Object.keys(LEGACY_REFINEMENT_SIGNAL_MIRROR) as AdaptiveRefinementId[]) {
    entries.push([
      id,
      {
        id,
        kind: "discovery",
        machineLabel: LEGACY_MACHINE_LABEL[id],
        discoverySignal: LEGACY_REFINEMENT_SIGNAL_MIRROR[id],
      },
    ]);
  }
  for (const id of TRADEOFF_OPTION_IDS) {
    entries.push([
      id,
      { id, kind: "tradeoff", machineLabel: TRADEOFF_MACHINE_LABEL[id], discoverySignal: null },
    ]);
  }
  return Object.fromEntries(entries) as Record<DirectorOptionId, DirectorOption>;
}

export const DIRECTOR_OPTION_CATALOG = buildCatalog();

export const DIRECTOR_OPTION_IDS = Object.keys(DIRECTOR_OPTION_CATALOG) as DirectorOptionId[];

export function isDirectorOptionId(value: string): value is DirectorOptionId {
  return Object.prototype.hasOwnProperty.call(DIRECTOR_OPTION_CATALOG, value);
}

export function directorOption(id: DirectorOptionId): DirectorOption {
  return DIRECTOR_OPTION_CATALOG[id];
}

/** Fail-closed lookup: unknown ids resolve to `null`, never to an invention. */
export function discoverySignalForOption(id: string): LivingAtlasDiscoverySignal | null {
  return isDirectorOptionId(id) ? DIRECTOR_OPTION_CATALOG[id].discoverySignal : null;
}

/* ------------------------------------------------------------------ */
/* Concrete choices                                                     */
/* ------------------------------------------------------------------ */

/**
 * A concrete, offerable choice instance.
 *
 * `id` stays the closed catalog ACTION id. `choiceKey` is the collision-safe
 * identity of this specific instance: two swap options that drop different
 * stops share an action id but are never the same choice.
 */
export type DirectorChoice = DirectorOption & {
  choiceKey: string;
  /** Exact BUILD-1 truth payload for tradeoff choices. Never invented. */
  timingOption?: TimingConflictOption;
};

/**
 * Canonical, truth-complete identity of a BUILD-1 timing option. Includes the
 * full payload, not just the action kind, so a payload change invalidates any
 * fingerprint derived from it. No timestamps, no ids that could reorder.
 */
export function timingOptionIdentity(option: TimingConflictOption): unknown {
  switch (option.option) {
    case "extend-duration":
      return ["extend-duration", option.toClass, option.extraMinutesGained];
    case "swap-moment":
      return [
        "swap-moment",
        option.dropStopId,
        option.forStopId,
        option.minutesRecovered,
        option.dimensionCost,
      ];
    case "choose-between-anchors":
      // `anchorStopIds` is set-like by definition, so it is order-normalised.
      return ["choose-between-anchors", [...option.anchorStopIds].sort()];
  }
}

export function timingChoiceKey(option: TimingConflictOption): string {
  return JSON.stringify(timingOptionIdentity(option));
}

/** Discovery choices are their own instance: `choiceKey === id`. */
export function discoveryChoice(id: AdaptiveRefinementId): DirectorChoice {
  return { ...DIRECTOR_OPTION_CATALOG[id], choiceKey: id };
}

/** One concrete choice per REAL BUILD-1 option. Unavailable actions never appear. */
export function timingChoice(option: TimingConflictOption): DirectorChoice {
  const id = TIMING_ACTION_OPTION_ID[option.option];
  return {
    ...DIRECTOR_OPTION_CATALOG[id],
    choiceKey: timingChoiceKey(option),
    timingOption: option,
  };
}
