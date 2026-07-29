/**
 * Resolve a CSS motion custom property to a millisecond number.
 *
 * Reads from `getComputedStyle(document.documentElement)`, so the CSS
 * remains the single numerical source of truth. Safe on the server:
 * returns `fallbackMs` when `window` is unavailable.
 *
 * Usage:
 *   readMotionMs("--dur-image")           // → 780
 *   readMotionMs("--dur-image", 800)      // → 780 (or 800 on SSR)
 */
export function readMotionMs(customProperty: string, fallbackMs = 0): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallbackMs;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(customProperty).trim();
  if (!raw) return fallbackMs;
  // "560ms" → 560, "0.56s" → 560
  if (raw.endsWith("ms")) return parseFloat(raw) || fallbackMs;
  if (raw.endsWith("s")) return (parseFloat(raw) || 0) * 1000 || fallbackMs;
  const asNumber = parseFloat(raw);
  return Number.isFinite(asNumber) ? asNumber : fallbackMs;
}
