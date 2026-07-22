/**
 * UTM capture + persistence.
 *
 * On boot we snapshot recognized attribution params from location.search
 * into sessionStorage (per-session) and localStorage (30-day window),
 * so downstream events + Stripe metadata can attribute the conversion
 * even if the user navigated across many pages first.
 *
 * SSR/test-safe: every function no-ops when window is absent.
 */
const KEY = "yes.utm.v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const RECOGNISED = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export type UtmKey = (typeof RECOGNISED)[number];
export type UtmSnapshot = Partial<Record<UtmKey, string>> & { _ts?: number };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readStore(storage: Storage | undefined): UtmSnapshot | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UtmSnapshot;
    if (parsed._ts && Date.now() - parsed._ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read current-page UTMs (if any) and persist them. Idempotent per page. */
export function captureUtmsFromLocation(): UtmSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const url = new URL(window.location.href);
    const snap: UtmSnapshot = {};
    for (const key of RECOGNISED) {
      const v = url.searchParams.get(key);
      if (v && v.length <= 200) snap[key] = v;
    }
    if (Object.keys(snap).length === 0) return getUtms();
    snap._ts = Date.now();
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(snap));
      window.localStorage.setItem(KEY, JSON.stringify(snap));
    } catch {
      /* private mode — silent */
    }
    return snap;
  } catch {
    return null;
  }
}

/** Return the freshest known UTM snapshot (session wins over local). */
export function getUtms(): UtmSnapshot | null {
  if (!isBrowser()) return null;
  return readStore(window.sessionStorage) ?? readStore(window.localStorage);
}

/** Flatten into a params object suitable for event payloads / Stripe metadata. */
export function utmParams(): Record<string, string> {
  const s = getUtms();
  if (!s) return {};
  const out: Record<string, string> = {};
  for (const k of RECOGNISED) if (s[k]) out[k] = s[k]!;
  return out;
}
