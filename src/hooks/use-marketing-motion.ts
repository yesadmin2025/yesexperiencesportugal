import { useEffect } from "react";

let activeConsumers = 0;
let disposeController: (() => void) | undefined;
let controllerBoot: Promise<void> | undefined;
let teardownTimer: ReturnType<typeof setTimeout> | undefined;

function teardownMarketingMotion(): void {
  if (activeConsumers > 0) return;
  disposeController?.();
  disposeController = undefined;
  controllerBoot = undefined;
  document.documentElement.classList.remove("motion-ready");
  delete document.documentElement.dataset.motionScope;
}

function acquireMarketingMotion(): () => void {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = undefined;
  }
  activeConsumers += 1;
  document.documentElement.dataset.motionScope = "marketing";

  if (!controllerBoot) {
    controllerBoot = import("@/lib/home-motion").then(({ startHomeMotion }) => {
      if (activeConsumers > 0 && !disposeController) disposeController = startHomeMotion();
    });
  }

  return () => {
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (activeConsumers > 0) return;
    // Route transitions and React StrictMode can release and reacquire the
    // shared controller in the same task. Deferring teardown prevents a
    // stale dynamic import from orphaning the live editorial motion scope.
    teardownTimer = setTimeout(() => {
      teardownTimer = undefined;
      teardownMarketingMotion();
    }, 0);
  };
}

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
    if (NON_EDITORIAL_PATHS.some((pattern) => pattern.test(pathname))) return;
    return acquireMarketingMotion();
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
  // RootComponent now owns the single pathname-aware controller, avoiding
  // duplicate route-level acquire/release cycles during SPA transitions.
}
