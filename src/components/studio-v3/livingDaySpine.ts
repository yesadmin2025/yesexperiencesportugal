// Studio V3 — Pass 2A "Living Day spine".
//
// Pure, deterministic derivation of the persistent Living Day artefact.
// It NEVER invents stops, never mutates Studio state, never touches
// curation scoring, RHYTHM_STOP_COUNT, phase order or pricing. Everything
// concrete comes from `resolveStudioV3Route`; everything customer-facing
// passes through the winery presentation guard.
//
// Three truthful stages:
//   direction — DNA only (feeling / companions / destination). No stops,
//               no moment count, no route.
//   draft     — enough taste to preview a real route BEFORE rhythm exists.
//               Resolved with a PRESENTATION-ONLY tentative "balanced"
//               rhythm, exactly like `continueFromInterests`. State is not
//               mutated; the surface is labelled as a draft.
//   shaped    — `state.rhythm` exists → resolve from the real rhythm.

import { getOptionLabel, resolveStudioV3Route } from "./curation";
import { buildWineryDisplayLabels, studioDisplayLabel } from "./studioWineryPresentation";
import { signatureTours } from "@/data/signatureTours";
import {
  COMPANIONS,
  FEELINGS,
  INTERESTS,
  RHYTHMS,
  type Interest,
  type StudioV3Phase,
  type StudioV3State,
} from "./types";

export type LivingDayStage = "hidden" | "direction" | "draft" | "shaped";

export interface LivingDaySnapshot {
  stage: LivingDayStage;
  /** 2–4 DNA chips from real choices only. */
  dna: string[];
  /** Customer-facing region, only when a route actually resolved. */
  region: string | null;
  duration: string | null;
  /** Real resolved moment count. 0 in `direction`. */
  momentCount: number;
  /** Customer-safe moment labels (wineries genericised), full ordered list. */
  moments: string[];
  /** Customer-safe route sentence, only when resolved. */
  routeLine: string | null;
  /** INTERNAL — resolved Signature id, never displayed. */
  tourId: string | null;
  /** True when the route was previewed with a tentative balanced rhythm. */
  tentativeRhythm: boolean;
}

export const EMPTY_LIVING_DAY: LivingDaySnapshot = {
  stage: "hidden",
  dna: [],
  region: null,
  duration: null,
  momentCount: 0,
  moments: [],
  routeLine: null,
  tourId: null,
  tentativeRhythm: false,
};

/** Phases where the Living Day must never appear. */
const LIVING_DAY_BLOCKED_PHASES: ReadonlySet<StudioV3Phase> = new Set<StudioV3Phase>([
  "intro",
  "map",
  "storyboard",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
]);

export function isLivingDayPhaseAllowed(phase: StudioV3Phase): boolean {
  return !LIVING_DAY_BLOCKED_PHASES.has(phase);
}

/** Stage the state qualifies for, ignoring phase/reaction gating. */
export function livingDayStageFor(state: StudioV3State): LivingDayStage {
  const hasFeeling = !!state.feeling;
  const hasCompanions = !!state.companions;
  const hasInterest = (state.interests ?? []).length > 0;

  if (hasFeeling && hasCompanions && state.rhythm) return "shaped";
  if (hasFeeling && hasCompanions && hasInterest) return "draft";
  // "no-preference" is the default, not an answer — it must not light the artefact.
  const hasDestination = !!state.destinationIntent && state.destinationIntent !== "no-preference";
  if (hasFeeling || hasCompanions || hasDestination) return "direction";
  return "hidden";
}

function dnaChips(state: StudioV3State): string[] {
  const pills: string[] = [];
  if (state.feeling) pills.push(getOptionLabel(FEELINGS, state.feeling));
  if (state.companions) pills.push(getOptionLabel(COMPANIONS, state.companions));
  if (state.rhythm) pills.push(getOptionLabel(RHYTHMS, state.rhythm));
  const first = (state.interests ?? [])[0];
  if (first) pills.push(getOptionLabel(INTERESTS, first));
  return pills.filter(Boolean).slice(0, 4);
}

/**
 * Build the Living Day snapshot for a Studio state.
 * `phase` / `reactionActive` only gate visibility — never the derivation.
 */
export function buildLivingDaySnapshot(
  state: StudioV3State,
  options?: { phase?: StudioV3Phase; reactionActive?: boolean },
): LivingDaySnapshot {
  const phase = options?.phase ?? state.phase;
  if (options?.reactionActive) return EMPTY_LIVING_DAY;
  if (phase && !isLivingDayPhaseAllowed(phase)) return EMPTY_LIVING_DAY;

  const stage = livingDayStageFor(state);
  if (stage === "hidden") return EMPTY_LIVING_DAY;

  const dna = dnaChips(state);
  if (stage === "direction") {
    return { ...EMPTY_LIVING_DAY, stage: dna.length > 0 ? "direction" : "hidden", dna };
  }

  const tentativeRhythm = !state.rhythm;
  const resolved = resolveStudioV3Route({
    feeling: state.feeling!,
    companions: state.companions!,
    // PRESENTATION ONLY — never written back into state.rhythm.
    rhythm: state.rhythm ?? "balanced",
    interests: state.interests,
    pickup: state.pickup,
    occasion: state.occasion,
    investment: state.investment,
    destinationIntent: state.destinationIntent,
    dateExact: state.dateExact,
  });

  const points = resolved?.composedRoutePoints?.length
    ? resolved.composedRoutePoints
    : (resolved?.routePoints ?? []);

  if (points.length === 0) {
    return { ...EMPTY_LIVING_DAY, stage: dna.length > 0 ? "direction" : "hidden", dna };
  }

  const display = buildWineryDisplayLabels(points.map((p) => ({ label: p.label })));
  const moments = points.map((p) => studioDisplayLabel(p.label, display));
  const tour = resolved.skeletonTourKey
    ? (signatureTours.find((t) => t.id === resolved.skeletonTourKey) ?? null)
    : null;

  return {
    stage: tentativeRhythm ? "draft" : "shaped",
    dna,
    region: tour?.region ?? null,
    duration: tour?.durationHours ?? null,
    momentCount: moments.length,
    moments,
    routeLine: genericiseRouteLine(resolved.suggestedRouteLabel, display),
    tourId: resolved.skeletonTourKey ?? null,
    tentativeRhythm,
  };
}

/** Replace any supplier winery name inside the resolver's route sentence. */
export function genericiseRouteLine(
  line: string | null | undefined,
  display: ReadonlyMap<string, string>,
): string | null {
  if (!line) return null;
  let out = line;
  for (const [canonical, generic] of display) {
    if (!canonical) continue;
    out = out.split(canonical).join(generic);
  }
  return out;
}

export type LivingDayTrigger = "interest" | "rhythm" | "destination" | "other";

export interface LivingDayFeedback {
  text: string;
  trigger: LivingDayTrigger;
  deltaCount: number;
}

function sameRoute(a: LivingDaySnapshot, b: LivingDaySnapshot): boolean {
  return a.moments.join("|") === b.moments.join("|");
}

/**
 * Derive ONE short causal line from a real state+snapshot transition.
 * Returns null when nothing meaningful changed. Never invents a route
 * consequence that the resolver did not actually produce.
 */
export function livingDayFeedback(
  prevState: StudioV3State,
  nextState: StudioV3State,
  prev: LivingDaySnapshot,
  next: LivingDaySnapshot,
): LivingDayFeedback | null {
  if (next.stage === "hidden") return null;

  const prevInterests = prevState.interests ?? [];
  const nextInterests = nextState.interests ?? [];
  const added = nextInterests.filter((i) => !prevInterests.includes(i));
  const removed = prevInterests.filter((i) => !nextInterests.includes(i));
  const routeChanged = !sameRoute(prev, next);
  const countDelta = next.momentCount - prev.momentCount;

  if (added.length > 0) {
    const label = interestLabel(added[0]!);
    if (next.momentCount === 0) {
      return { text: `${label} is now shaping the day.`, trigger: "interest", deltaCount: 0 };
    }
    if (routeChanged) {
      return {
        text: `${label} added · route updated.`,
        trigger: "interest",
        deltaCount: Math.abs(countDelta),
      };
    }
    return { text: `${label} is now shaping the day.`, trigger: "interest", deltaCount: 0 };
  }

  if (removed.length > 0) {
    const label = interestLabel(removed[0]!);
    return {
      text: `${label} is less central now.`,
      trigger: "interest",
      deltaCount: Math.abs(countDelta),
    };
  }

  if (prevState.rhythm !== nextState.rhythm && nextState.rhythm) {
    const rhythm = getOptionLabel(RHYTHMS, nextState.rhythm);
    if (countDelta !== 0 && prev.momentCount > 0) {
      const n = Math.abs(countDelta);
      const word = countDelta < 0 ? "fewer" : "more";
      return {
        text: `${rhythm} rhythm · ${n} ${word} ${n === 1 ? "moment" : "moments"}.`,
        trigger: "rhythm",
        deltaCount: n,
      };
    }
    if (routeChanged && prev.momentCount > 0) {
      return { text: `${rhythm} rhythm · route reshaped.`, trigger: "rhythm", deltaCount: 0 };
    }
    return { text: `${rhythm} rhythm applied.`, trigger: "rhythm", deltaCount: 0 };
  }

  if (prevState.destinationIntent !== nextState.destinationIntent && next.region) {
    return { text: `${next.region} is taking shape.`, trigger: "destination", deltaCount: 0 };
  }

  if (routeChanged && prev.stage !== "hidden" && next.momentCount > 0) {
    return { text: "Your day just updated.", trigger: "other", deltaCount: Math.abs(countDelta) };
  }

  return null;
}

function interestLabel(id: Interest): string {
  const label = getOptionLabel(INTERESTS, id);
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "That interest";
}

/** Stable identity of a snapshot — used to avoid double-firing analytics. */
export function livingDaySnapshotKey(s: LivingDaySnapshot): string {
  return [s.stage, s.region ?? "", s.momentCount, s.moments.join("|"), s.dna.join("|")].join("·");
}
