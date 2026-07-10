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

import { resolveStudioV3Route, pickupCityLabel } from "./curation";
import { findTour } from "@/data/signatureTours";
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

  const resolved = resolveStudioV3Route({
    feeling: state.feeling,
    companions: state.companions,
    rhythm: state.rhythm,
    interests: state.interests,
    pickup: state.pickup,
    occasion: state.occasion,
    considerations: state.considerations,
    investment: state.investment,
    destinationIntent: state.destinationIntent,
  });

  const routePoints =
    state.editedRoutePoints && state.editedRoutePoints.length > 0
      ? state.editedRoutePoints.map((p, i) => ({ label: p.label, story: p.story, index: i }))
      : resolved.routePoints.map((p) => ({ label: p.label, story: p.story, index: p.index }));

  const chapters: SignatureStoryChapter[] = routePoints.map((p) => ({
    title: p.label,
    body: p.story,
  }));

  const inclusions: string[] =
    tour?.included && tour.included.length > 0
      ? tour.included.slice(0, 8)
      : ["Private guide", "Private transport", "All confirmed entries"];

  const guests =
    overrides?.guests && overrides.guests > 0
      ? overrides.guests
      : (state.guests ?? 2);

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
