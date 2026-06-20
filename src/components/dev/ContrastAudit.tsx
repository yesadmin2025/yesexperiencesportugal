import { useEffect } from "react";

/**
 * ContrastAudit — dev-only WCAG AA contrast scanner.
 *
 * Walks every visible text node in the document, resolves its computed
 * foreground color against its first opaque ancestor background, and
 * logs anything that falls below WCAG 2.1 AA:
 *   - 4.5:1 for normal text
 *   - 3.0:1 for "large" text (≥18pt or ≥14pt bold)
 *
 * Failing nodes are visually flagged with a soft red dashed outline so
 * they can be spotted in the live preview. Runs once on mount and
 * re-runs whenever the route changes (the parent re-mounts it via key).
 *
 * Excluded from production builds — only renders when import.meta.env.DEV.
 */

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(str: string): Rgb | null {
  if (!str) return null;
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map((p) => p.trim());
  if (parts.length < 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
  return { r, g, b, a };
}

function relLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite fg over bg using fg's alpha. */
function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/** Walk up the tree to find the first non-transparent backdrop color. */
function resolveBackground(el: Element): Rgb {
  let cur: Element | null = el;
  while (cur) {
    const cs = getComputedStyle(cur);
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      // If the surface is itself translucent, blend it onto white so the
      // ratio reflects what the eye actually sees on a white page bg.
      if (bg.a < 1) {
        return composite(bg, { r: 255, g: 255, b: 255, a: 1 });
      }
      return bg;
    }
    cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function isLargeText(cs: CSSStyleDeclaration): boolean {
  const px = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10) || 400;
  // 18pt = 24px ; 14pt bold = ~18.66px
  return px >= 24 || (px >= 18.66 && weight >= 700);
}

function hasDirectText(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}

type Finding = {
  el: Element;
  ratio: number;
  required: number;
  fg: string;
  bg: string;
  text: string;
  inFocus?: boolean;
};

function audit(root: Element): Finding[] {
  const findings: Finding[] = [];
  const all = root.querySelectorAll("*");
  for (const el of Array.from(all)) {
    if (!hasDirectText(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.1) continue;
    // Skip aria-hidden / sr-only style elements
    if ((el as HTMLElement).getAttribute("aria-hidden") === "true") continue;
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;

    const fg = parseColor(cs.color);
    if (!fg) continue;
    const bg = resolveBackground(el);
    const effectiveFg = fg.a < 1 ? composite(fg, bg) : fg;
    const ratio = contrastRatio(effectiveFg, bg);
    const required = isLargeText(cs) ? 3 : 4.5;
    if (ratio + 0.01 < required) {
      findings.push({
        el,
        ratio: Math.round(ratio * 100) / 100,
        required,
        fg: cs.color,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        text: (el.textContent ?? "").trim().slice(0, 80),
      });
    }
  }
  return findings;
}

const FLAG_ATTR = "data-contrast-fail";

/**
 * Selectors that define the *focused* outline scope. A finding only gets
 * the visual red dashed outline if it lives inside one of these regions.
 * Off-scope findings are still reported in the console table for
 * completeness, but won't paint the page with noise.
 *
 * Currently focused on:
 *   Homepage:
 *     - hero <section> (first section)
 *     - decision cards (#decision-flow)
 *     - Builder anchor card ([aria-labelledby="studio-title"])
 *     - final CTA section
 *   /experiences:
 *     - hero ([data-audit="experiences-hero"])
 *     - CTA strip ([data-audit="experiences-cta"])
 *   Global:
 *     - any CTA button labels (.cta-primary / .cta-secondary-light /
 *       .hero-cta-button)
 */
const FOCUS_SELECTORS = [
  "header",
  "section:first-of-type", // hero
  "#decision-flow",
  '[aria-labelledby="studio-title"]',
  '[data-audit="experiences-hero"]',
  '[data-audit="experiences-cta"]',
  ".cta-primary",
  ".cta-secondary-light",
  ".hero-cta-button",
];

function isInFocus(el: Element): boolean {
  for (const sel of FOCUS_SELECTORS) {
    try {
      if (el.closest(sel)) return true;
    } catch {
      // Invalid selector (older browsers) — ignore
    }
  }
  return false;
}

function flag(findings: Finding[]) {
  // Clear previous flags
  document.querySelectorAll(`[${FLAG_ATTR}]`).forEach((el) => {
    el.removeAttribute(FLAG_ATTR);
    (el as HTMLElement).style.removeProperty("outline");
    (el as HTMLElement).style.removeProperty("outline-offset");
  });
  for (const f of findings) {
    if (!f.inFocus) continue;
    f.el.setAttribute(FLAG_ATTR, `${f.ratio}:1 < ${f.required}:1`);
    (f.el as HTMLElement).style.outline = "1.5px dashed rgba(220, 38, 38, 0.85)";
    (f.el as HTMLElement).style.outlineOffset = "2px";
  }
}

export function ContrastAudit() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let raf = 0;
    const run = () => {
      const raw = audit(document.body);
      const findings = raw.map((f) => ({ ...f, inFocus: isInFocus(f.el) }));
      flag(findings);
      const focused = findings.filter((f) => f.inFocus);
      const offscope = findings.filter((f) => !f.inFocus);
      if (focused.length === 0 && offscope.length === 0) {
        console.info(
          "%c[contrast-audit] ✅ No AA failures detected.",
          "color:#16a34a;font-weight:600",
        );
      } else {
        console.warn(
          `[contrast-audit] ⚠️ ${focused.length} focused failure(s) outlined · ${offscope.length} off-scope failure(s) reported only.`,
        );
        if (focused.length > 0) {
          console.groupCollapsed(
            `%c[contrast-audit] FOCUSED — hero · cards · CTAs`,
            "color:#dc2626;font-weight:600",
          );

          console.table(
            focused.map((f) => ({
              ratio: f.ratio,
              required: f.required,
              fg: f.fg,
              bg: f.bg,
              text: f.text,
            })),
          );

          console.groupEnd();
        }
        if (offscope.length > 0) {
          console.groupCollapsed(
            `%c[contrast-audit] OFF-SCOPE (logged only)`,
            "color:#6b7280;font-weight:600",
          );

          console.table(
            offscope.map((f) => ({
              ratio: f.ratio,
              required: f.required,
              fg: f.fg,
              bg: f.bg,
              text: f.text,
            })),
          );

          console.groupEnd();
        }
      }
    };
    // Wait one frame after mount + a short delay so reveal animations,
    // fonts and images settle before measuring.
    raf = window.requestAnimationFrame(() => {
      window.setTimeout(run, 800);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return null;
}
