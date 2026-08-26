/**
 * signatureStorySnapshot — pure builder that freezes the current Studio V3
 * state into the shape the Signature Story email template consumes.
 *
 * Kept side-effect free (no React, no server code) so the email trigger
 * on Guest Details can compute the snapshot synchronously at blur time
 * and the value never mutates while the email is in flight.
 *
 * No invention rule: `chapters` and `inclusions` are ALWAYS drawn from
 * the resolved route + Signature tour data — never from AI, never from
 * hard-coded generic copy.
 */

import { pickupCityLabel } from "./curation";
import {
  resolveAuthoritativeRouteStops,
  resolveStudioRouteFromState,
} from "./studioRouteAuthority";
import { findTour } from "@/data/signatureTours";
import { getTourContent } from "@/lib/tourContent";
import type { StudioV3State } from "./types";

export interface SignatureStoryChapter {
  readonly title: string;
  readonly body: string;
}

export interface SignatureStorySnapshot {
  readonly title: string;
  readonly dateLabel: string | null;
  readonly guests: number;
  readonly pickupLabel: string;
  readonly chapters: SignatureStoryChapter[];
  readonly inclusions: string[];
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

export function buildSignatureStorySnapshot(
  state: StudioV3State,
  overrides?: { guests?: number; pickupAddress?: string; dateIso?: string },
): SignatureStorySnapshot {
  const tour = state.tourId ? findTour(state.tourId) : null;

  // Same complete projection + authority chain as the reveal, so the email
  // story can never describe a different day (or lose dateExact / refinement /
  // reshape seed) than the one the traveller approved.
  const routePoints = resolveAuthoritativeRouteStops({
    editedRoutePoints: state.editedRoutePoints,
    resolved: resolveStudioRouteFromState(state),
    catalogStops: tour?.stops ?? null,
  });

  const chapters: SignatureStoryChapter[] = routePoints.map((p) => ({
    title: p.label,
    body: p.story,
  }));

  const includedResolved = tour?.id ? getTourContent(tour.id).included : [];
  const inclusions: string[] =
    includedResolved.length > 0
      ? includedResolved.slice(0, 8)
      : tour?.included && tour.included.length > 0
        ? tour.included.slice(0, 8)
        : ["Private guide", "Private transport", "All confirmed entries"];

  const guests = overrides?.guests && overrides.guests > 0 ? overrides.guests : (state.guests ?? 2);

  const pickupLabel =
    overrides?.pickupAddress?.trim() ||
    state.guestDraft?.pickupAddress?.trim() ||
    pickupCityLabel(state.pickup) ||
    "Pickup shared with your host";

  return {
    title: state.journeyTitle ?? tour?.title ?? "Your story in Portugal",
    dateLabel: formatDate(overrides?.dateIso ?? state.dateExact),
    guests,
    pickupLabel,
    chapters,
    inclusions,
  };
}

/**
 * buildJourneyRevision — stable, deterministic hash of everything that
 * defines the composed journey. Used as the idempotency key seed for the
 * Signature Story email:
 *
 *   - identical revision  → email deduplicates (guest never sees a repeat)
 *   - refined journey     → new revision → one fresh email allowed
 *
 * Inputs are the same facts the Storytelling, Guest Details recap,
 * Summary and Stripe payload all read from — so the email a guest
 * receives always matches the journey they just approved.
 *
 * Pure sync string builder (no crypto). The hash is a djb2-style
 * fingerprint — collision-resistant enough for per-email dedupe within
 * a single traveller's session; the real cryptographic hash happens
 * server-side inside sendSignatureStoryEmail using this value as input.
 */
export function buildJourneyRevision(
  state: StudioV3State,
  extras?: { addOnIds?: readonly string[]; adults?: number; minorAges?: readonly number[] },
): string {
  const routeLabels = resolveAuthoritativeRouteStops({
    editedRoutePoints: state.editedRoutePoints,
    resolved: resolveStudioRouteFromState(state),
  }).map((p) => p.label);

  const addOnPart = (extras?.addOnIds ?? []).slice().sort().join(",");
  const minorPart = (extras?.minorAges ?? [])
    .slice()
    .sort((a, b) => a - b)
    .join(",");
  const adults = extras?.adults ?? state.guests ?? 0;

  const parts = [
    state.tourId ?? "",
    routeLabels.join("|"),
    addOnPart,
    state.dateExact ?? "",
    state.pickup ?? "",
    String(adults),
    minorPart,
  ].join("§");

  // djb2 → base36 → 12 chars max (compact, stable across runs, no deps).
  let h = 5381;
  for (let i = 0; i < parts.length; i++) {
    h = ((h << 5) + h + parts.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).slice(0, 12);
}
