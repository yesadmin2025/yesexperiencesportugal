/**
 * Studio V3 — deterministic semantic memory.
 *
 * A tiny, pure layer that answers one question: "what has the traveller
 * ALREADY told us?". It is derived strictly from Studio state (feeling,
 * interests, rhythm) — never from free text, never from AI output.
 *
 * It is used for two things only:
 *   1. suppressing adaptive questions that would merely reconfirm a theme
 *      the traveller already stated;
 *   2. a short, safe "understood" acknowledgement.
 *
 * It NEVER mutates state, adds interests, or feeds pricing, curation, stops,
 * suppliers or availability.
 */

import { hasExplicitWineIntent } from "./studioWineIntent";
import type { StudioV3State } from "./types";

export const STUDIO_SEMANTIC_THEMES = [
  "theme.faith",
  "activity.hands-on",
  "theme.wine",
  "theme.coast",
  "interest.local-life",
  "intent.photography",
  "pace.rhythm",
] as const;

export type StudioSemanticTheme = (typeof STUDIO_SEMANTIC_THEMES)[number];

export type StudioSemanticMemory = ReadonlySet<StudioSemanticTheme>;

type MemoryInput = Pick<StudioV3State, "feeling" | "interests" | "rhythm">;

/** Known semantic themes for the current answers. Explicit signals only. */
export function deriveSemanticMemory(state: MemoryInput): StudioSemanticMemory {
  const interests = state.interests ?? [];
  const known = new Set<StudioSemanticTheme>();

  // Faith: explicit feeling or explicit interest. Never inferred from heritage.
  if (state.feeling === "faith" || interests.includes("faith")) known.add("theme.faith");

  // Hands-on: explicit only. Heritage, culture, local life and hidden Portugal
  // are NOT workshop intent.
  if (state.feeling === "hands-on" || interests.includes("hands-on")) {
    known.add("activity.hands-on");
  }

  // Wine: single source of truth, explicit only.
  if (hasExplicitWineIntent({ feeling: state.feeling, interests })) known.add("theme.wine");

  if (state.feeling === "coastal" || interests.includes("coast")) known.add("theme.coast");

  if (interests.includes("local-life") || state.feeling === "hidden") {
    known.add("interest.local-life");
  }

  if (interests.includes("photography")) known.add("intent.photography");

  if (state.rhythm) known.add("pace.rhythm");

  return known;
}

export function knowsTheme(state: MemoryInput, theme: StudioSemanticTheme): boolean {
  return deriveSemanticMemory(state).has(theme);
}

const RHYTHM_SIGNAL: Record<string, string> = {
  slow: "slow rhythm",
  balanced: "balanced rhythm",
  full: "full rhythm",
  immersive: "immersive rhythm",
};

/**
 * Up to three short positive signals, built only from what the traveller
 * explicitly chose. No destinations, stops, suppliers, prices or negatives.
 */
export function understoodSignals(state: MemoryInput): string[] {
  const known = deriveSemanticMemory(state);
  const signals: string[] = [];
  const push = (label: string) => {
    if (signals.length < 3 && !signals.includes(label)) signals.push(label);
  };

  if (known.has("theme.coast")) push("Coast first");
  if (known.has("theme.wine")) push("Wine and table");
  if (known.has("theme.faith")) push("A reflective day");
  if (known.has("activity.hands-on")) push("Hands-on");
  if (known.has("interest.local-life")) push("Local life");
  if (known.has("intent.photography")) push("Photography");
  if (state.rhythm) push(RHYTHM_SIGNAL[state.rhythm] ?? "");

  return signals.filter(Boolean).slice(0, 3);
}

export interface UnderstoodSummary {
  lead: string;
  signals: string[];
  /** Second line, already joined for display. */
  detail: string;
}

/** Null whenever there is nothing useful to acknowledge. */
export function understoodSummary(state: MemoryInput): UnderstoodSummary | null {
  const signals = understoodSignals(state);
  if (signals.length === 0) return null;
  return { lead: "I've got it.", signals, detail: signals.join(" · ") };
}
