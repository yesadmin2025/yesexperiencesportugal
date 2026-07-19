/**
 * Motion tokens — SEMANTIC STRING REFERENCES ONLY.
 *
 * CSS custom properties in `src/styles.css` are the single numerical
 * source of truth for the site-wide motion system. This module exposes
 * `var(--…)` strings so TS/JSX consumers can compose transitions without
 * ever duplicating a duration or easing value.
 *
 * When a hook needs a real millisecond number (e.g. to schedule a
 * `setTimeout` fallback), use `readMotionMs()` from `./readMotionMs`,
 * which reads the resolved value from `getComputedStyle`.
 */

export const dur = {
  tap: "var(--dur-tap)",
  quick: "var(--dur-quick)",
  base: "var(--dur-base)",
  slow: "var(--dur-slow)",
  text: "var(--dur-text)",
  image: "var(--dur-image)",
  scene: "var(--dur-scene)",
  cinematic: "var(--dur-cinematic)",
} as const;

export const ease = {
  premium: "var(--ease-premium)",
  snap: "var(--ease-snap)",
  scene: "var(--ease-scene)",
} as const;

export const stagger = {
  sm: "var(--stagger-sm)",
  md: "var(--stagger-md)",
} as const;

export type DurationToken = keyof typeof dur;
export type EasingToken = keyof typeof ease;
