/**
 * Error classification for client-side observability (P0).
 *
 * Without a category, ad-blocked analytics beacons and localhost asset 404s
 * look exactly like a broken checkout. Categories:
 *
 *   critical            — payment/checkout/booking breakage, hydration crash
 *   functional          — app-level failure with a visible impact
 *   asset_fallback      — image/media/font/chunk that failed to load
 *   third_party_blocked — analytics/tag/insights blocked by the browser
 *   dev_noise           — HMR / vite / localhost-only development noise
 */

export type ErrorCategory =
  | "critical"
  | "functional"
  | "asset_fallback"
  | "third_party_blocked"
  | "dev_noise";

const THIRD_PARTY_HINTS = [
  "googletagmanager",
  "google-analytics",
  "gtag",
  "vercel-insights",
  "vitals.vercel",
  "/_vercel/insights",
  "doubleclick",
  "facebook.net",
  "trustindex",
  "hotjar",
  "clarity.ms",
  "err_blocked_by_client",
  "blocked by the client",
];

const DEV_HINTS = ["/@vite/", "@react-refresh", "hmr", "localhost:8080/src/", "sourcemap"];

const CRITICAL_HINTS = [
  "stripe",
  "checkout",
  "create-signature-checkout",
  "create-builder-checkout",
  "booking",
  "payment",
  "hydrat",
];

export function classifyClientError(input: {
  message?: string | null;
  source?: string | null;
  severity?: string | null;
  route?: string | null;
  hostname?: string | null;
}): ErrorCategory {
  const haystack = `${input.message ?? ""} ${input.source ?? ""}`.toLowerCase();
  const host = (input.hostname ?? "").toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");

  if (THIRD_PARTY_HINTS.some((h) => haystack.includes(h))) return "third_party_blocked";
  if (DEV_HINTS.some((h) => haystack.includes(h))) return "dev_noise";

  // Dynamic chunk / module-script load failures: the app can retry or fall
  // back, so they must not sit in the same bucket as a broken checkout.
  if (
    haystack.includes("dynamically imported module") ||
    haystack.includes("loading chunk") ||
    haystack.includes("importing a module script failed") ||
    haystack.includes("error loading dynamically")
  ) {
    return isLocal ? "dev_noise" : "asset_fallback";
  }

  if (input.severity === "resource") {
    if (isLocal) return "dev_noise";
    // A failed JS chunk breaks a route; images/fonts degrade gracefully.
    if (/\.(m?js|css)(\?|$)/.test(haystack) || haystack.includes("chunk")) return "functional";
    return "asset_fallback";
  }

  if (CRITICAL_HINTS.some((h) => haystack.includes(h))) return "critical";
  if (isLocal) return "dev_noise";
  return "functional";
}
