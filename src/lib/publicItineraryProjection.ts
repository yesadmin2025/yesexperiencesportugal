/**
 * Public Signature itinerary projection — presentation-only truth guard.
 *
 * The Source of Truth (`SIGNATURE_SOURCE_OF_TRUTH`) intentionally stores the
 * real internal candidate identities of alternative supplier pools (named
 * wineries) for operations, geography and Viator evidence. Those candidates
 * are NOT itinerary promises: only `poolPick[poolId].min` of them actually
 * run, and which ones is an operational choice.
 *
 * This module projects the SoT itinerary into what the public Signature page
 * may truthfully show: an unresolved winery pool collapses into ONE generic
 * contractual chapter derived from `poolPick`. Everything else — core,
 * optional, conditional, pass-by, non-winery pools — is preserved verbatim.
 *
 * Pure. No SoT mutation, no invented facts, no coordinates.
 */

import { getSot, type SotItineraryChapter } from "@/data/signatureToursSourceOfTruth";

export const WINERY_POOL_ID = "wineries";

/** Generic display label used for an unresolved winery pool pin/chapter. */
export const GENERIC_WINERY_PIN_LABEL = "Local winery visit";

export type PublicItineraryChapter = {
  order: number;
  label: string;
  description: string;
  durationMinutes: number | null;
  travelToNextMinutes: number | null;
  optional: boolean;
  stopType: SotItineraryChapter["stopType"];
  isDefault: boolean;
  poolId?: string;
  /** True when this chapter represents a collapsed supplier pool. */
  isPoolSummary?: boolean;
};

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];

function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function genericWineryPoolLabel(count: number): string {
  return `${countWord(count)} local winery visit${count === 1 ? "" : "s"}`;
}

export function genericWineryPoolStory(count: number): string {
  return count === 1
    ? "One local winery visit is included within your private route."
    : `${countWord(count)} local winery visits are included within your private route.`;
}

function toPublicChapter(c: SotItineraryChapter): PublicItineraryChapter {
  return {
    order: c.order,
    label: c.label,
    description: c.description,
    durationMinutes: c.durationMinutes,
    travelToNextMinutes: c.travelToNextMinutes,
    optional: c.optional,
    stopType: c.stopType,
    isDefault: c.isDefault,
    ...(c.poolId ? { poolId: c.poolId } : {}),
  };
}


/**
 * Project a tour's SoT itinerary for public display.
 * Returns `undefined` when the tour has no SoT entry (callers keep their
 * existing fallbacks).
 */
export function projectPublicSotItinerary(tourId: string): PublicItineraryChapter[] | undefined {
  const sot = getSot(tourId);
  if (!sot || sot.itinerary.length === 0) return undefined;

  const ordered = sot.itinerary.slice().sort((a, b) => a.order - b.order);
  const wineryMembers = ordered.filter(
    (c) => c.stopType === "alternative-pool" && c.poolId === WINERY_POOL_ID,
  );

  if (wineryMembers.length === 0) {
    return ordered.map(toPublicChapter);
  }

  const pick = sot.poolPick?.[WINERY_POOL_ID];
  const count = Math.max(1, pick?.min ?? wineryMembers.length);
  const first = wineryMembers[0]!;

  const out: PublicItineraryChapter[] = [];
  for (const c of ordered) {
    const isPoolMember = c.stopType === "alternative-pool" && c.poolId === WINERY_POOL_ID;
    if (!isPoolMember) {
      out.push(toPublicChapter(c));
      continue;
    }
    if (c !== first) continue;
    out.push({
      order: c.order,
      label: genericWineryPoolLabel(count),
      description: genericWineryPoolStory(count),
      durationMinutes: null,
      travelToNextMinutes: null,
      optional: false,
      stopType: "core",
      isDefault: true,
      poolId: WINERY_POOL_ID,
      isPoolSummary: true,
    });
  }
  return out;
}

/** The named winery-pool candidate labels of a tour (internal identities). */
export function wineryPoolCandidateLabels(tourId: string): string[] {
  const sot = getSot(tourId);
  if (!sot) return [];
  return sot.itinerary
    .filter((c) => c.stopType === "alternative-pool" && c.poolId === WINERY_POOL_ID)
    .map((c) => c.label);
}

/**
 * Display-level guard for the public route map: geo identity is preserved,
 * but an unresolved winery candidate never shows its supplier name in a pin,
 * tooltip, legend or accessible label.
 */
export function sanitizePublicMapStopLabels<T extends { label: string }>(
  tourId: string,
  stops: T[],
): T[] {
  const named = new Set(wineryPoolCandidateLabels(tourId));
  if (named.size === 0) return stops;
  return stops.map((s) =>
    named.has(s.label) ? ({ ...s, label: GENERIC_WINERY_PIN_LABEL } as T) : s,
  );
}
