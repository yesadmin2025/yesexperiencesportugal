import { useEffect } from "react";

const NON_EDITORIAL_PATHS = [
  /^\/admin(?:\/|\.|$)/,
  /^\/auth(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/book(?:\/|$)/,
  /^\/booking-(?:confirmed|receipt)(?:\/|$)/,
  /^\/builder(?:\/|$)/,
  /^\/checkout(?:\/|\.|$)/,
  /^\/studio(?:\/|-|$)/,
  /^\/tours\/[^/]+\/tailor(?:\/|$)/,
  /^\/(?:i|s)\.[^/]+/,
  /^\/(?:lovable|\.lovable|mcp|e2e\.|qa\.|hero-verify|preview-check|typography-audit)/,
] as const;

export function usePublicEditorialMotion(pathname: string): void {
  useEffect(() => {
    if (NON_EDITORIAL_PATHS.some((pattern) => pattern.test(pathname))) {
      document.documentElement.classList.remove("motion-ready");
      delete document.documentElement.dataset.motionScope;
      return;
    }

    document.documentElement.dataset.motionScope = "marketing";
    let cancelled = false;
    let disposeController: (() => void) | undefined;
    let firstFrame = 0;
    let secondFrame = 0;

    const start = () => {
      void import("@/lib/home-motion").then(({ startHomeMotion }) => {
        if (!cancelled) disposeController = startHomeMotion();
      });
    };

    // Two frames keep DOM annotation post-hydration without the old mutation
    // quiet-window, which could postpone mobile motion for 1.2 seconds.
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!cancelled) start();
      });
    });




    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      disposeController?.();
      document.documentElement.classList.remove("motion-ready");
      delete document.documentElement.dataset.motionScope;
    };
  }, [pathname]);
}

/**
 * useMarketingMotion — boots the existing homepage motion controller
 * (`src/lib/home-motion.ts`) for a public marketing route and scopes its
 * visual values via a `data-motion-scope="marketing"` attribute on
 * <html> for the lifetime of the route.
 *
 * Contract (matches the approved bounded plan):
 *   • Reuses the single `[data-motion]` / `.motion-in` primitive — no
 *     second animation system is introduced.
 *   • Marketing scope caps translateY at 8px and duration at 220ms
 *     (see `html[data-motion-scope="marketing"]` rules in `styles.css`).
 *   • Runs once per element (controller contract).
 *   • `prefers-reduced-motion: reduce` short-circuits everything.
 *   • Never toggles pointer-events / tabIndex / aria-*; no layout shift.
 *   • Per-page boot only — no global wrapper. Checkout, admin, auth,
 *     Studio, Signature booking, Builder and Tailored routes never mount
 *     this hook.
 */
export function useMarketingMotion(): void {
  // Kept as a compatibility hook for existing public route components.
  // RootComponent owns the pathname-aware controller.
}
