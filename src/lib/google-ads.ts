import type {} from "@/lib/google-analytics";

export const GOOGLE_ADS_ID = "AW-18281912739";
export const COOKIE_CHOICE_KEY = "yes.cookieConsent.v1";
export const AD_NOTICE_VERSION = "google-ads-2026-10-26";
export const AD_NOTICE = "Google Ads receives page URLs without query strings, device/browser information, IP address and advertising cookie identifiers to measure advertising and improve ad delivery. No booking contact details are sent. You can withdraw marketing permission in Cookie preferences.";
const EVIDENCE_KEY = "yes.adConsent.evidence.v1";
const VISITOR_KEY = "yes.adConsent.visitor.v1";
const CONSENT_COUNTRIES = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','CA']);

type AdChoice = { ads?: unknown; noticeVersion?: unknown };
let regionLookup: Promise<string | null> | undefined;
let configured = false;

export function requiresAdConsent(country: string | null): boolean {
  return !country || country === "XX" || country === "T1" || CONSENT_COUNTRIES.has(country);
}

export function adPermission(choice: AdChoice | null, country: string | null): boolean {
  if (choice?.ads === "denied") return false;
  if (choice?.ads === "granted" && choice.noticeVersion === AD_NOTICE_VERSION) return true;
  return !requiresAdConsent(country);
}

export function readAdChoice(): AdChoice | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COOKIE_CHOICE_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? parsed as AdChoice : null;
  } catch { return null; }
}

export function lookupAdRegion(): Promise<string | null> {
  return regionLookup ??= (async () => {
    try {
      const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return (await res.text()).match(/^loc=([A-Z0-9]{2})$/m)?.[1] ?? null;
    } catch { return null; }
  })();
}

export async function canLoadGoogleAds(): Promise<boolean> {
  const initial = readAdChoice();
  if (initial?.ads === "denied") return false;
  if (initial?.ads === "granted" && initial.noticeVersion === AD_NOTICE_VERSION) return true;
  const country = await lookupAdRegion();
  return adPermission(readAdChoice(), country);
}

/** Append rather than overwrite: withdrawal must not erase acceptance evidence. */
export async function recordAdDecision(ads: "granted" | "denied", analytics: "granted" | "denied") {
  const country = await lookupAdRegion();
  let visitor = localStorage.getItem(VISITOR_KEY);
  if (!visitor) {
    visitor = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitor);
  }
  const history: unknown = JSON.parse(localStorage.getItem(EVIDENCE_KEY) ?? "[]");
  const records = Array.isArray(history) ? history : [];
  records.push({ visitor, decidedAt: new Date().toISOString(), ads, analytics, country,
    noticeVersion: AD_NOTICE_VERSION, notice: AD_NOTICE,
    choices: ["Essential only", "Accept all", "Customise: Analytics and Marketing"],
    recipient: "Google Ads", purposes: ["advertising measurement", "ad delivery optimization"] });
  localStorage.setItem(EVIDENCE_KEY, JSON.stringify(records));
}

/** Basic blocking: no Ads configuration or script before permission. No event replay. */
export async function syncGoogleAds(): Promise<void> {
  if (typeof window === "undefined") return;
  const allowed = await canLoadGoogleAds();
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => { window.dataLayer?.push(args); };
  window.gtag("consent", "update", {
    ad_storage: allowed ? "granted" : "denied",
    ad_user_data: "denied", // No customer matching requested.
    ad_personalization: allowed ? "granted" : "denied",
  });
  window[`ga-disable-${GOOGLE_ADS_ID}` as keyof Window] = !allowed as never;
  if (!allowed || configured) return;
  configured = true;
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID, {
    allow_enhanced_conversions: false,
    page_location: `${location.origin}${location.pathname}`,
    page_referrer: document.referrer ? new URL(document.referrer).origin : "",
  });
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.googleAds = "";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(script);
  }
}

export function initializeGoogleAds(): () => void {
  void syncGoogleAds();
  const onStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_CHOICE_KEY || event.key === null) void syncGoogleAds();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}