/**
 * WCAG 2.1 contrast utilities.
 *
 * Runtime helper used by legal/trust marks that must stay legible on any
 * footer/section background variant. Dev-only warnings; a silent no-op in
 * production so we never ship console noise or perf cost to users.
 *
 * Spec: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *   AA  normal text: ≥ 4.5:1
 *   AA  large text / non-text UI (incl. logos where legibility matters): ≥ 3:1
 *   AAA normal text: ≥ 7:1
 */

export type WcagLevel = "AA" | "AAA";
export type WcagSize = "normal" | "large" | "graphic";

const THRESHOLDS: Record<WcagLevel, Record<WcagSize, number>> = {
  AA: { normal: 4.5, large: 3, graphic: 3 },
  AAA: { normal: 7, large: 4.5, graphic: 4.5 },
};

/** Parse `rgb()`, `rgba()`, `#rgb`, `#rrggbb` into linear-space [r,g,b] 0-1. */
function parseColor(input: string): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // rgb() / rgba()
  const rgb = s.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .slice(0, 3);
    if (parts.length !== 3) return null;
    const nums = parts.map((p) => {
      if (p.endsWith("%")) return (parseFloat(p) / 100) * 255;
      return parseFloat(p);
    });
    if (nums.some((n) => Number.isNaN(n))) return null;
    return [nums[0] / 255, nums[1] / 255, nums[2] / 255];
  }

  // #rgb / #rrggbb
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const n = parseInt(h, 16);
    return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
  }

  return null;
}

/** WCAG relative luminance for an sRGB color (0-1 per channel). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Contrast ratio between two colors. Returns 1.0–21.0. */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Walk up ancestors to find the first ancestor with a non-transparent background. */
function resolveEffectiveBackground(el: Element): string {
  let node: Element | null = el;
  while (node && node instanceof Element) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/i.test(bg) && bg !== "transparent") {
      return bg;
    }
    node = node.parentElement;
  }
  // Fallback to document body / white.
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : "";
  return bodyBg || "rgb(255,255,255)";
}

export interface ContrastAssertion {
  ratio: number;
  required: number;
  passes: boolean;
  fg: string;
  bg: string;
  level: WcagLevel;
  size: WcagSize;
}

/**
 * Assert an element's effective foreground has adequate contrast against its
 * resolved background. Logs a `console.warn` in dev when the ratio is below
 * the WCAG threshold for `level`/`size`. No-op in production.
 *
 * `foreground` overrides the computed color — pass the intended mark color
 * (e.g. `"#FFFFFF"` for a white-filtered PNG whose computed `color` doesn't
 * reflect the CSS `filter`).
 */
export function assertContrast(
  el: HTMLElement | null,
  {
    foreground,
    level = "AA",
    size = "graphic",
    label,
  }: {
    foreground?: string;
    level?: WcagLevel;
    size?: WcagSize;
    label?: string;
  } = {},
): ContrastAssertion | null {
  if (!el || typeof window === "undefined") return null;
  if (import.meta.env.PROD) return null;

  const fg = foreground ?? getComputedStyle(el).color;
  const bg = resolveEffectiveBackground(el);
  const ratio = contrastRatio(fg, bg);
  if (ratio == null) return null;

  const required = THRESHOLDS[level][size];
  const passes = ratio >= required;

  if (!passes) {
    console.warn(
      `[a11y:contrast] ${label ?? "element"} fails WCAG ${level} (${size}): ratio ${ratio.toFixed(2)}:1 < required ${required}:1`,
      { fg, bg, el },
    );
  }

  return { ratio, required, passes, fg, bg, level, size };
}
