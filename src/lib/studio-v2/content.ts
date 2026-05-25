// Studio v2 — content for the 5-stage guided consultation.
// Copy is intentionally professional, concierge tone. Edit here, not in components.

import type { IntentAtmosphere, PaceV2, PriorityKey } from "./profile";

export const INTENT_OPTIONS: { id: IntentAtmosphere; label: string; sub: string }[] = [
  { id: "relaxed_scenic",     label: "Relaxed & scenic",      sub: "Slow roads, long views, breathing room" },
  { id: "elegant_cultural",   label: "Elegant & cultural",    sub: "Heritage, architecture, quiet sophistication" },
  { id: "food_local",         label: "Food-led & local",      sub: "Markets, cellars, generous tables" },
  { id: "social_celebratory", label: "Social & celebratory",  sub: "A day that lifts the occasion" },
  { id: "romantic_intimate",  label: "Romantic & intimate",   sub: "Designed for two, unhurried" },
  { id: "coastal_cinematic",  label: "Coastal & cinematic",   sub: "Cliffs, light, the Atlantic edge" },
];

export const PACE_OPTIONS: { id: PaceV2; label: string; sub: string }[] = [
  { id: "light",    label: "Light & spacious",  sub: "Three considered stops, plenty of room" },
  { id: "balanced", label: "Balanced",          sub: "Four stops, natural rhythm" },
  { id: "rich",     label: "Rich but relaxed",  sub: "Five stops, fuller day, still elegant" },
  { id: "full",     label: "Maximize the day",  sub: "Most we can offer without strain" },
];

export const PRIORITY_OPTIONS: { id: PriorityKey; label: string }[] = [
  { id: "vineyard_lunch",   label: "Vineyard lunch" },
  { id: "coastal_scenery",  label: "Coastal scenery" },
  { id: "architecture",     label: "Architecture" },
  { id: "hidden_villages",  label: "Hidden villages" },
  { id: "photography",      label: "Photography moments" },
  { id: "quiet_luxury",     label: "Quiet luxury" },
  { id: "wellness",         label: "Wellness" },
  { id: "boat",             label: "Boat experience" },
  { id: "local_gastronomy", label: "Local gastronomy" },
  { id: "wine_cellar",      label: "Wine cellar" },
  { id: "heritage",         label: "Heritage" },
];

export const TRANSITION_COPY = {
  afterIntent: "Understood. Let's shape the rhythm.",
  afterGroup:  "Now balancing pace, comfort and flow.",
  afterPace:   "Aligning priorities to that rhythm.",
  afterPrios:  "Final logistics, then the design.",
} as const;

/** Tap-twice weighting: single = 50, double (must) = 100. */
export const PRIORITY_WEIGHTS = { single: 50, must: 100 } as const;

/**
 * Atmospheric backdrops per intent. Token-based radial washes — no imagery.
 * Used by Studio v2 to let Portugal be *felt* before any configuration.
 * `tintA` = dominant warm/cool wash; `tintB` = secondary lift; `mix` = strength %.
 */
export const INTENT_ATMOSPHERE: Record<
  IntentAtmosphere,
  { tintA: string; tintB: string; mix: number; whisper: string }
> = {
  relaxed_scenic:     { tintA: "var(--sand)",  tintB: "var(--gold-soft)", mix: 55, whisper: "Wide horizons, slow light." },
  elegant_cultural:   { tintA: "var(--ivory)", tintB: "var(--sand)",      mix: 70, whisper: "Stone, shadow, quiet rooms." },
  food_local:         { tintA: "var(--gold-soft)", tintB: "var(--sand)",  mix: 60, whisper: "Cellars, copper light, long lunches." },
  social_celebratory: { tintA: "var(--gold)",  tintB: "var(--gold-soft)", mix: 35, whisper: "A day that lifts the room." },
  romantic_intimate:  { tintA: "var(--gold-soft)", tintB: "var(--ivory)", mix: 50, whisper: "Two, the coast, dusk." },
  coastal_cinematic:  { tintA: "var(--teal-2)", tintB: "var(--ivory)",    mix: 35, whisper: "Cliffs, salt, Atlantic gold." },
};
