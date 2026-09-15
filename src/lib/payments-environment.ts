/**
 * Single source of truth for the payments environment (Stripe live vs test).
 *
 * P0 stabilization: the environment must NEVER be decided by which build
 * happened to embed which publishable key. Live mode is reachable only from
 * the canonical production hosts. Previews, Lovable hosts, localhost, CI and
 * Playwright always resolve to `sandbox` (test mode).
 *
 * The server (edge functions) enforces the same rule independently — see
 * `supabase/functions/_shared/payments-environment.ts`. This module is the
 * client-side half and is also used by build/runtime guards and tests.
 */

export type PaymentsEnvironment = "sandbox" | "live";

/** Hosts allowed to reach Stripe LIVE. Nothing else, ever. */
export const CANONICAL_PAYMENT_HOSTS = [
  "yesexperiencesportugal.com",
  "www.yesexperiencesportugal.com",
] as const;

export function isCanonicalPaymentHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.trim().toLowerCase().replace(/\.$/, "");
  return (CANONICAL_PAYMENT_HOSTS as readonly string[]).includes(h);
}

/** True when the current context is an automated QA / headless run. */
export function isAutomatedContext(nav?: {
  webdriver?: boolean;
  userAgent?: string;
}): boolean {
  const n =
    nav ??
    (typeof navigator !== "undefined"
      ? (navigator as unknown as { webdriver?: boolean; userAgent?: string })
      : undefined);
  if (!n) return false;
  if (n.webdriver === true) return true;
  const ua = (n.userAgent ?? "").toLowerCase();
  return ua.includes("headlesschrome") || ua.includes("playwright") || ua.includes("puppeteer");
}

/**
 * Resolve the environment for a given host + publishable key.
 *
 * Rules, in order:
 *   1. A test publishable key can only ever mean `sandbox`.
 *   2. Automated/headless contexts are forced to `sandbox`.
 *   3. Live is allowed only on a canonical production host.
 */
export function resolvePaymentsEnvironment(input: {
  hostname: string | null | undefined;
  publishableKey?: string | null;
  automated?: boolean;
}): PaymentsEnvironment {
  const key = input.publishableKey ?? "";
  if (key.startsWith("pk_test_")) return "sandbox";
  if (input.automated) return "sandbox";
  return isCanonicalPaymentHost(input.hostname) ? "live" : "sandbox";
}

/**
 * Runtime guard: a live publishable key must never be used off-canonical.
 * Returns a reason string when the combination is illegal, else null.
 */
export function livePaymentsGuardViolation(input: {
  hostname: string | null | undefined;
  publishableKey?: string | null;
  automated?: boolean;
}): string | null {
  const key = input.publishableKey ?? "";
  if (!key.startsWith("pk_live_")) return null;
  if (input.automated) return "Live payment key used in an automated/headless session.";
  if (!isCanonicalPaymentHost(input.hostname)) {
    return `Live payment key used on non-canonical host "${input.hostname ?? "unknown"}".`;
  }
  return null;
}
