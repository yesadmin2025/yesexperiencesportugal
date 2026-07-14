import { useEffect } from "react";

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
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.motionScope = "marketing";
    }
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import("@/lib/home-motion").then(({ startHomeMotion }) => {
      if (cancelled) return;
      dispose = startHomeMotion();
    });
    return () => {
      cancelled = true;
      dispose?.();
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.motionScope;
      }
    };
  }, []);
}
