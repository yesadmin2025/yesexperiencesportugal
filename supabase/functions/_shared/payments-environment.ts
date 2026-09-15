/**
 * Server-side payments environment lock (P0).
 *
 * The environment is derived from the request `Origin` (falling back to the
 * return URL origin). A client-supplied `environment` field is advisory only:
 * it can never upgrade a request to LIVE. Live mode is reachable exclusively
 * from the canonical production origins.
 */

export type PaymentsEnv = "sandbox" | "live";

export const CANONICAL_PAYMENT_ORIGINS = [
  "https://yesexperiencesportugal.com",
  "https://www.yesexperiencesportugal.com",
];

export function isCanonicalPaymentOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return CANONICAL_PAYMENT_ORIGINS.includes(origin.trim().toLowerCase().replace(/\/$/, ""));
}

function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Resolve the authoritative environment for a checkout request.
 *
 * `requestOrigin` — the `Origin` (or `Referer`) header. This is the ONLY
 * signal that can authorize LIVE. A missing or non-canonical request origin
 * always resolves to sandbox; `returnUrl` is never used to authorize live
 * (it is client-supplied and only used for redirect validation).
 * `claimed` — what the client asked for; only ever used to DOWNGRADE to sandbox.
 */
export function resolveServerPaymentsEnv(input: {
  requestOrigin?: string | null;
  returnUrl?: string | null;
  claimed?: string | null;
}): { environment: PaymentsEnv; origin: string | null; downgraded: boolean } {
  const origin = originOf(input.requestOrigin);
  const allowed: PaymentsEnv = isCanonicalPaymentOrigin(origin) ? "live" : "sandbox";
  // The client may only ask for less (test mode), never for more.
  const environment: PaymentsEnv = input.claimed === "sandbox" ? "sandbox" : allowed;
  return { environment, origin, downgraded: allowed === "sandbox" && input.claimed === "live" };
}

/**
 * Return-URL allowlist, scoped by environment.
 * Live sessions may only return to the canonical production origins —
 * `extraAllow` can never widen LIVE.
 */
export function isReturnOriginAllowed(
  origin: string | null,
  environment: PaymentsEnv,
  extraAllow: string[] = [],
): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  if (environment === "live") return isCanonicalPaymentOrigin(o);
  if (isCanonicalPaymentOrigin(o) || extraAllow.includes(o)) return true;
  if (
    o === "https://yesexperiences.pt" ||
    o === "https://www.yesexperiences.pt" ||
    o === "https://dreamscape-builder-co.lovable.app"
  )
    return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.dev$/.test(o)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(o)) return true;
  return false;
}
