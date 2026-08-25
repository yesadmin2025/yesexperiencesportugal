/**
 * Studio V3 — P6 "Acknowledge once" ledger.
 *
 * Studio surfaces the same three facts (feeling, taste, rhythm) on several
 * screens: the P5 "Already understood" row on Interests, the understood line
 * on the refinement question, the same line again before Logistics, and the
 * reason signals on the final reveal. Each surface used to re-derive its copy
 * independently, so the traveller heard their own answers read back four
 * times. This module is the single authority for what has ALREADY been
 * acknowledged on screen, so every later surface can show only what is new.
 *
 * Rules (non-negotiable):
 *   - Pure and deterministic. Derived from Studio state on every render; no
 *     mutable ledger, no persistence, no AI, no side effects.
 *   - Never writes to state. Never touches pricing, curation, stops, maps,
 *     analytics or checkout.
 *   - Operational facts (date, pickup, party, region) are NOT acknowledgements
 *     and are never suppressed — confirming them twice is correct.
 *   - Silence over filler: when nothing new remains, a surface renders nothing.
 */

import { deriveInheritedIntent } from "./studioInheritedIntent";
import { understoodSignals, type StudioSemanticTheme } from "./studioSemanticMemory";
import type { Feeling, Interest, Rhythm } from "./types";

/** Surfaces that may acknowledge a taste/emotion/rhythm signal, in flow order. */
export const ACKNOWLEDGEMENT_SURFACE_ORDER = [
  "interests",
  "refinement",
  "logistics",
  "reveal",
] as const;

export type AcknowledgementSurface = (typeof ACKNOWLEDGEMENT_SURFACE_ORDER)[number];

export interface AcknowledgementState {
  readonly feeling?: Feeling | null;
  readonly interests?: ReadonlyArray<Interest> | null;
  readonly rhythm?: Rhythm | null;
}

export interface AcknowledgementContext {
  readonly state: AcknowledgementState;
  /** True only when the adaptive refinement question is actually rendered. */
  readonly refinementShown: boolean;
}

/** Interests that the Feeling phase can inherit, and the theme each stands for. */
const INHERITED_INTEREST_THEME: Readonly<Partial<Record<Interest, StudioSemanticTheme>>> = {
  faith: "theme.faith",
  "hands-on": "activity.hands-on",
  coast: "theme.coast",
  wine: "theme.wine",
};

/** Exact labels produced by `understoodSignals`, mapped to their theme. */
const UNDERSTOOD_LABEL_THEME: ReadonlyArray<readonly [string, StudioSemanticTheme]> = [
  ["coast first", "theme.coast"],
  ["wine and table", "theme.wine"],
  ["a reflective day", "theme.faith"],
  ["hands-on", "activity.hands-on"],
  ["local life", "interest.local-life"],
  ["photography", "intent.photography"],
  ["slow rhythm", "pace.rhythm"],
  ["balanced rhythm", "pace.rhythm"],
  ["full rhythm", "pace.rhythm"],
  ["immersive rhythm", "pace.rhythm"],
];

/**
 * Free-prose signals (the reveal reasons) do not carry a label id, so their
 * theme is read from the vocabulary each theme owns. Deliberately narrow —
 * an unrecognised sentence is treated as new, never as a duplicate.
 */
const PROSE_THEME_PATTERNS: ReadonlyArray<readonly [StudioSemanticTheme, RegExp]> = [
  ["theme.wine", /\b(wine|cellar|vineyard|winery)\b/i],
  ["theme.coast", /\b(coast|coastal|atlantic|ocean|sea air|shoreline)\b/i],
  ["theme.faith", /\b(faith|sacred|sanctuar|pilgrim)/i],
  ["activity.hands-on", /\b(hands-on|workshop|maker)/i],
  ["interest.local-life", /\blocal life\b/i],
  ["intent.photography", /\bphotograph/i],
  ["pace.rhythm", /\b(rhythm|fewer moments|fuller day|a long day|even rhythm)\b/i],
];

/** The theme a signal talks about, or null when it introduces something new. */
export function themeOfSignal(signal: string): StudioSemanticTheme | null {
  const text = signal.trim().toLowerCase();
  if (!text) return null;
  for (const [label, theme] of UNDERSTOOD_LABEL_THEME) {
    if (text === label) return theme;
  }
  for (const [theme, pattern] of PROSE_THEME_PATTERNS) {
    if (pattern.test(text)) return theme;
  }
  return null;
}

/** Themes the P5 "Already understood" row on Interests shows. */
export function interestsAcknowledgedThemes(state: AcknowledgementState): StudioSemanticTheme[] {
  const inherited = deriveInheritedIntent({
    feeling: state.feeling ?? null,
    interests: state.interests ?? [],
    rhythm: state.rhythm ?? null,
  });
  const themes: StudioSemanticTheme[] = [];
  for (const id of inherited.interestIds) {
    const theme = INHERITED_INTEREST_THEME[id];
    if (theme && !themes.includes(theme)) themes.push(theme);
  }
  return themes;
}

function memoryInput(state: AcknowledgementState) {
  return {
    feeling: state.feeling ?? null,
    interests: [...(state.interests ?? [])],
    rhythm: state.rhythm ?? null,
  };
}

function dropAcknowledged(signals: ReadonlyArray<string>, seen: ReadonlySet<StudioSemanticTheme>) {
  const out: string[] = [];
  const used = new Set<StudioSemanticTheme>();
  for (const signal of signals) {
    const theme = themeOfSignal(signal);
    if (theme && (seen.has(theme) || used.has(theme))) continue;
    if (theme) used.add(theme);
    out.push(signal);
  }
  return out;
}

/**
 * Every theme acknowledged strictly BEFORE `surface`. The reveal is terminal:
 * nothing consumes its output, so it is never added here.
 */
export function themesAcknowledgedBefore(
  surface: AcknowledgementSurface,
  ctx: AcknowledgementContext,
): Set<StudioSemanticTheme> {
  const seen = new Set<StudioSemanticTheme>();
  if (surface === "interests") return seen;

  for (const theme of interestsAcknowledgedThemes(ctx.state)) seen.add(theme);
  if (surface === "refinement") return seen;

  if (ctx.refinementShown) {
    for (const signal of dropAcknowledged(understoodSignals(memoryInput(ctx.state)), seen)) {
      const theme = themeOfSignal(signal);
      if (theme) seen.add(theme);
    }
  }
  if (surface === "logistics") return seen;

  // Reveal: whatever Logistics showed also counts as already heard.
  for (const signal of acknowledgementSignalsFor("logistics", ctx)) {
    const theme = themeOfSignal(signal);
    if (theme) seen.add(theme);
  }
  return seen;
}

/**
 * The acknowledgement labels a question surface should show. Empty means the
 * traveller has already heard everything this surface could say — render
 * nothing rather than a placeholder.
 */
export function acknowledgementSignalsFor(
  surface: Exclude<AcknowledgementSurface, "interests" | "reveal">,
  ctx: AcknowledgementContext,
): string[] {
  const seen = themesAcknowledgedBefore(surface, ctx);
  return dropAcknowledged(understoodSignals(memoryInput(ctx.state)), seen).slice(0, 3);
}

export interface AcknowledgementSummary {
  readonly lead: string;
  readonly signals: ReadonlyArray<string>;
  /** Second line, already joined for display. */
  readonly detail: string;
}

/** Null whenever the surface has nothing new to acknowledge. */
export function acknowledgementSummaryFor(
  surface: Exclude<AcknowledgementSurface, "interests" | "reveal">,
  ctx: AcknowledgementContext,
): AcknowledgementSummary | null {
  const signals = acknowledgementSignalsFor(surface, ctx);
  if (signals.length === 0) return null;
  return { lead: "I've got it.", signals, detail: signals.join(" · ") };
}

/**
 * Reveal reason signals with echoes of earlier acknowledgements removed.
 *
 * The reveal is the payoff, so it is protected by a floor: it never renders
 * fewer than `minKeep` signals while the composed narrative offers that many.
 * De-duplication may quieten the reveal; it may never empty it.
 */
export function filterRevealSignals(
  signals: ReadonlyArray<string>,
  ctx: AcknowledgementContext,
  minKeep = 2,
): string[] {
  const seen = themesAcknowledgedBefore("reveal", ctx);
  const kept = dropAcknowledged(signals, seen);
  if (kept.length >= Math.min(minKeep, signals.length)) return kept;
  // Floor: restore, in original order, until the reveal reads as a reveal.
  const restored = [...kept];
  for (const signal of signals) {
    if (restored.length >= Math.min(minKeep, signals.length)) break;
    if (!restored.includes(signal)) restored.push(signal);
  }
  return signals.filter((s) => restored.includes(s));
}
