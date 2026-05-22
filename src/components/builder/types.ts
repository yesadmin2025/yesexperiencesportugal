// Shared Builder types — must match builderEngine.server.ts vocabulary.

export type Mood = "slow" | "curious" | "romantic" | "open" | "energetic";
export type Who = "couple" | "family" | "friends" | "solo" | "corporate" | "group";
export type Intention =
  | "wine"
  | "gastronomy"
  | "nature"
  | "heritage"
  | "coast"
  | "hidden"
  | "wonder"
  | "wellness";
export type Pace = "relaxed" | "balanced" | "full";
export type JourneyType = "day" | "multi";

/**
 * Affinity profile — derived (not stored) from emotional selections.
 * Used to subtly tint imagery, motion duration, microcopy and suggestion
 * ranking. Each axis is normalised 0–1. Never surfaced as UI text.
 *
 * v5: extended for AI cinematic orchestration. `depth` kept for legacy
 * suggestion scoring; `curiosity`, `elegance`, `spontaneity`, `pacing`
 * shape prompt tone and motion rhythm.
 */
export interface AffinityProfile {
  warmth: number;
  depth: number;
  energy: number;
  intimacy: number;
  curiosity: number;
  elegance: number;
  spontaneity: number;
  pacing: number;
}

/**
 * Narrative stage — how far the emotional thread has progressed. Used to
 * shape AI fragments from distant → intimate, and to gate visible UI.
 */
export type NarrativeStage = "invitation" | "recognition" | "emergence" | "reveal";

/**
 * Composed proposal identity — generated once near the reveal, then cached.
 * Title is editorial (2–5 words), subtitle is 8–14 words and may use the
 * traveller's name once.
 */
export interface StudioProposal {
  title: string;
  subtitle: string;
  generatedAt: number;
}

export interface RoutedStopUI {
  key: string;
  region_key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
  driveMinutesFromPrev: number;
}

export interface RouteUI {
  region: { key: string; label: string; blurb: string | null; lat: number; lng: number };
  pace: Pace;
  stops: RoutedStopUI[];
  totals: { experienceMinutes: number; drivingMinutes: number; stopMinutes: number };
  pricePerPersonEur: number;
  feasible: boolean;
  warnings: string[];
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Stable WhatsApp number for "Chat with a local" prompts. */
export const BUILDER_WA_NUMBER = "351911889992";
export function builderWaHref(message: string): string {
  return `https://wa.me/${BUILDER_WA_NUMBER}?text=${encodeURIComponent(message)}`;
}
