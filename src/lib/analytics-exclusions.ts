/**
 * Shared traffic-exclusion guard for every analytics channel.
 *
 * Internal admin work, auth screens, sandbox previews, the published
 * *.lovable.app mirror, local dev and automated QA must never reach the
 * production property.
 *
 * Excluded:
 *   • any /admin, /pt/admin, /auth (or /pt/auth) route
 *   • Lovable preview / sandbox / published-mirror hosts
 *   • localhost / 127.0.0.1 / *.local
 *   • automated sessions (webdriver, headless, Playwright)
 *
 * Escape hatch for manual QA: `localStorage.YES_ANALYTICS_FORCE = "1"`.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

const CANONICAL_ANALYTICS_HOSTS = new Set([
  "yesexperiencesportugal.com",
  "www.yesexperiencesportugal.com",
]);

function isCanonicalAnalyticsHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  return CANONICAL_ANALYTICS_HOSTS.has(hostname.trim().toLowerCase().replace(/\.$/, ""));
}

function forced(): boolean {
  try {
    return window.localStorage.getItem("YES_ANALYTICS_FORCE") === "1";
  } catch {
    return false;
  }
}

export function isAdminPath(pathname: string): boolean {
  return /^\/(?:pt\/)?admin(?:\/|$)/.test(pathname);
}

/** Auth screens are internal plumbing, never a commercial funnel step. */
export function isAuthPath(pathname: string): boolean {
  return /^\/(?:pt\/)?auth(?:\/|$)/.test(pathname);
}

export function isExcludedPath(pathname: string): boolean {
  return isAdminPath(pathname) || isAuthPath(pathname);
}

export function isExcludedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local"))
    return true;
  if (h.startsWith("id-preview--")) return true;
  if (h.endsWith(".lovableproject.com")) return true;
  if (h.endsWith(".sandbox.lovable.dev")) return true;
  // The *.lovable.app mirror is a staging surface, not the commercial site.
  if (h.endsWith(".lovable.app")) return true;
  return false;
}

/** Automated QA (Playwright/headless) must never pollute commercial reporting. */
export function isAutomatedSession(nav?: { webdriver?: boolean; userAgent?: string }): boolean {
  const n =
    nav ??
    (typeof navigator !== "undefined"
      ? (navigator as unknown as { webdriver?: boolean; userAgent?: string })
      : undefined);
  if (!n) return false;
  if (n.webdriver === true) return true;
  const ua = (n.userAgent ?? "").toLowerCase();
  return (
    ua.includes("headlesschrome") ||
    ua.includes("playwright") ||
    ua.includes("puppeteer") ||
    ua.includes("lighthouse")
  );
}

/** Reporting dimension: which surface produced this event. */
export function analyticsEnvironment(hostname?: string): "production" | "preview" | "local" {
  const h = (hostname ?? (isBrowser() ? window.location.hostname : "")).toLowerCase();
  if (isCanonicalAnalyticsHost(h)) return "production";
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return "local";
  return "preview";
}

/** Reporting dimension: is this a real visitor or internal/automated traffic. */
export function analyticsTrafficType(): "external" | "internal" | "automated" {
  if (isAutomatedSession()) return "automated";
  if (!isBrowser()) return "internal";
  try {
    if (isExcludedPath(window.location.pathname)) return "internal";
    if (isExcludedHost(window.location.hostname)) return "internal";
  } catch {
    return "internal";
  }
  return "external";
}

/** True when analytics must not be collected for the current context. */
export function isTrackingDisabled(): boolean {
  if (!isBrowser()) return true;
  if (forced()) return false;
  if (isAutomatedSession()) return true;
  try {
    if (isExcludedHost(window.location.hostname)) return true;
    if (isExcludedPath(window.location.pathname)) return true;
  } catch {
    return true;
  }
  return false;
}
