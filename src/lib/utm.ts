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

/* ------------------------------------------------------------------ *
 * First-touch acquisition (referrer based).
 *
 * Google organic never carries utm_* — the only signal is the referrer
 * hostname on the FIRST page of the visit. We snapshot it once (first
 * touch wins for 30 days) so a paid booking reads as
 * "came from Google search → landed on /arrabida-wine-tour → paid".
 * Hostname + landing path only; no query string, no personal data.
 * ------------------------------------------------------------------ */

const ACQ_KEY = "yes.acq.v1";

export type AcquisitionSnapshot = {
  /** Normalised source, e.g. "google", "bing", "chatgpt.com", "direct". */
  attr_source: string;
  /** "organic" | "referral" | "direct" | "paid" | "social". */
  attr_medium: string;
  /** Landing pathname of the first page seen this visit. */
  landing_path: string;
  /** Referring site hostname only; never a full URL or search query. */
  original_referrer?: string;
  _ts: number;
};

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|baidu|yandex)\./i;
const SOCIAL = /(^|\.)(facebook|instagram|twitter|linkedin|pinterest|reddit|tiktok)\.(com|co)$/i;
const AI_REFERRERS = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|poe\.com)$/i;

function externalReferrerHost(): string {
  try {
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "");
    return host === window.location.hostname.replace(/^www\./, "") ? "" : host.slice(0, 120);
  } catch {
    return "";
  }
}

function classifyReferrer(referrer: string): { attr_source: string; attr_medium: string } {
  if (!referrer) return { attr_source: "direct", attr_medium: "direct" };
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return { attr_source: "direct", attr_medium: "direct" };
  }
  if (!host) return { attr_source: "direct", attr_medium: "direct" };
  if (AI_REFERRERS.test(host)) return { attr_source: host, attr_medium: "ai" };
  if (SEARCH_ENGINES.test(`${host}.`)) {
    return { attr_source: host.split(".")[0] || host, attr_medium: "organic" };
  }
  if (SOCIAL.test(host)) return { attr_source: host, attr_medium: "social" };
  return { attr_source: host, attr_medium: "referral" };
}

/**
 * Capture the first-touch acquisition once per visit. Safe to call on every
 * route change: an existing snapshot is never overwritten, and internal
 * referrers are ignored.
 */
export function captureAcquisitionFromLocation(): AcquisitionSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const existing = getAcquisition();
    if (existing) return existing;

    const referrerHost = externalReferrerHost();
    const { attr_source, attr_medium } = classifyReferrer(referrerHost ? `https://${referrerHost}` : "");

    const utm = getUtms();
    const snap: AcquisitionSnapshot = {
      attr_source: (utm?.utm_source || attr_source).slice(0, 80),
      attr_medium: (utm?.utm_medium || (utm?.gclid ? "paid" : attr_medium)).slice(0, 40),
      landing_path: window.location.pathname.slice(0, 160),
      original_referrer: referrerHost || undefined,
      _ts: Date.now(),
    };
    const raw = JSON.stringify(snap);
    try {
      window.sessionStorage.setItem(ACQ_KEY, raw);
    } catch {
      /* private mode — silent */
    }
    try {
      window.localStorage.setItem(ACQ_KEY, raw);
    } catch {
      /* private mode — silent */
    }
    return snap;
  } catch {
    return null;
  }
}

function readAcq(storage: Storage | undefined): AcquisitionSnapshot | null {
  try {
    const raw = storage?.getItem(ACQ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcquisitionSnapshot;
    if (!parsed?.attr_source) return null;
    if (parsed._ts && Date.now() - parsed._ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Freshest known first-touch acquisition (session wins over 30-day window). */
export function getAcquisition(): AcquisitionSnapshot | null {
  if (!isBrowser()) return null;
  return readAcq(window.sessionStorage) ?? readAcq(window.localStorage);
}

/** Flat metadata for checkout / events. */
export function acquisitionParams(): Record<string, string> {
  const a = getAcquisition();
  if (!a) return {};
  return {
    attr_source: a.attr_source,
    attr_medium: a.attr_medium,
    landing_path: a.landing_path,
  };
}

/** Public enquiry attribution; host/path only and bounded marketing parameters. */
export function leadAttribution(): Record<string, string> {
  if (!isBrowser()) return {};
  const first = getAcquisition();
  const utm = getUtms();
  const referrer = externalReferrerHost();
  const last = classifyReferrer(referrer ? `https://${referrer}` : "");
  const out: Record<string, string> = {
    landing_page: (first?.landing_path || window.location.pathname).slice(0, 160),
    first_touch_source: first?.attr_source || "direct",
    last_touch_source: utm?.utm_source || (referrer ? last.attr_source : first?.attr_source || "direct"),
  };
  if (first?.original_referrer || referrer) out.original_referrer = first?.original_referrer || referrer;
  for (const key of RECOGNISED) {
    if (key === "fbclid") continue;
    if (utm?.[key]) out[key] = utm[key]!;
  }
  return out;
}
