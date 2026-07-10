/**
 * Progressive-disclosure budget probe (plan §E).
 *
 * `usePresentationCtaBudget(ref)` observes the primary continuation CTA
 * on the Signature reveal and reports how many 100vh (mobile viewport)
 * scrolls separate the top of the page from the CTA when the reveal is
 * fully painted.
 *
 * The budget target is ≤ 6 viewports at 393×588 (mobile). Emission
 * paths (all fire-and-forget, no PII):
 *
 *   1. `document.documentElement.dataset.presentationCtaViewports = "N"`
 *      — stable hook for the Playwright budget spec.
 *   2. `window.dispatchEvent(new CustomEvent(
 *        "presentation_cta_within_viewports", { detail: { viewports, top, vh } }
 *      ))` — the "telemetry event" named in the plan; consumers can pipe
 *      it into analytics without this file taking a Supabase dep.
 *
 * Purely presentational and safe on SSR (no-op without `window`).
 */

import * as React from "react";

export interface PresentationCtaBudgetDetail {
  readonly viewports: number;
  readonly top: number;
  readonly vh: number;
}

export const PRESENTATION_CTA_BUDGET_EVENT = "presentation_cta_within_viewports" as const;
export const PRESENTATION_CTA_BUDGET_DATASET_KEY = "presentationCtaViewports" as const;
/** Max acceptable viewports (100vh scrolls) until the primary CTA is reached. */
export const PRESENTATION_CTA_VIEWPORT_BUDGET = 6;

/**
 * Compute how many 100vh viewports separate y=0 from `top`. Half-viewport
 * fragments count as a full viewport so the budget is honest — a CTA 5.1
 * viewports down reports 6, not 5.
 */
export function viewportsUntil(top: number, vh: number): number {
  if (!Number.isFinite(top) || !Number.isFinite(vh) || vh <= 0) return 0;
  if (top <= 0) return 0;
  return Math.ceil(top / vh);
}

export function measurePresentationCtaBudget(
  el: HTMLElement,
  win: Window = window,
): PresentationCtaBudgetDetail {
  const rect = el.getBoundingClientRect();
  const scrollY = win.scrollY ?? win.pageYOffset ?? 0;
  const top = rect.top + scrollY;
  const vh = win.innerHeight || 1;
  return { viewports: viewportsUntil(top, vh), top, vh };
}

export function usePresentationCtaBudget(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
): void {
  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let cancelled = false;

    const emit = () => {
      if (cancelled || !ref.current) return;
      const detail = measurePresentationCtaBudget(ref.current, window);
      try {
        document.documentElement.dataset[PRESENTATION_CTA_BUDGET_DATASET_KEY] = String(
          detail.viewports,
        );
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(
          new CustomEvent<PresentationCtaBudgetDetail>(PRESENTATION_CTA_BUDGET_EVENT, {
            detail,
          }),
        );
      } catch {
        /* ignore */
      }
    };

    // Wait one frame so the reveal has laid out before we measure.
    raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(emit);
    });

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
}
