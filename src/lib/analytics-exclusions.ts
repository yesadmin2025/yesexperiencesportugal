/**
 * Shared traffic-exclusion guard for every analytics channel.
 *
 * GA4 was reporting 0 sessions while Search Console showed real clicks.
 * Part of the repair is making sure the traffic we *do* send is clean:
 * internal admin work, sandbox previews and local dev must never reach
 * the production property.
 *
 * Excluded:
 *   • any /admin (or /pt/admin) route
 *   • Lovable preview / sandbox hosts (id-preview--*, *.lovableproject.com)
 *   • localhost / 127.0.0.1 / *.local
 *
 * Escape hatch for manual QA: `localStorage.YES_ANALYTICS_FORCE = "1"`.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
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

export function isExcludedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local"))
    return true;
  if (h.startsWith("id-preview--")) return true;
  if (h.endsWith(".lovableproject.com")) return true;
  if (h.endsWith(".sandbox.lovable.dev")) return true;
  return false;
}

/** True when analytics must not be collected for the current context. */
export function isTrackingDisabled(): boolean {
  if (!isBrowser()) return true;
  if (forced()) return false;
  try {
    if (isExcludedHost(window.location.hostname)) return true;
    if (isAdminPath(window.location.pathname)) return true;
  } catch {
    return true;
  }
  return false;
}
