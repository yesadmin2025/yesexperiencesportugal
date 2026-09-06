/**
 * Guide attribution — which Journal guide sent a reader to a booking.
 *
 * Model (crawl-clean):
 *   Internal guide → tour / Studio / guide links are plain canonical URLs.
 *   Attribution is captured at CLICK time by `recordGuideLinkClick()`, which
 *   persists a `{ guide_slug, slot, ts }` snapshot synchronously (sessionStorage
 *   + 30-day localStorage) before the browser or router navigates. No query
 *   string is appended, so search engines never discover `?ref=…` variants
 *   of pages that already have a clean canonical.
 *
 * Why not utm_* on internal hops: overwriting utm_source would destroy the
 * original acquisition source (Google, a newsletter, a partner blog). The real
 * first-touch UTM snapshot in `utm.ts` stays untouched and is carried
 * alongside, so a booking reads as "came from Google → read the Arrábida
 * guide → booked".
 *
 * Backwards compatibility: links shared or bookmarked while the older
 * `?ref=guide:<slug>&ref_slot=<slot>` scheme was live still work —
 * `captureGuideRefFromLocation()` keeps reading them on boot / navigation.
 *
 * Three jobs:
 *   1. persist the guide/slot snapshot when an internal guide link is clicked
 *   2. keep reading legacy `?ref=` URLs so old shares still attribute
 *   3. hand the snapshot to checkout so Stripe metadata (and therefore the
 *      `bookings` row) records the guide that produced the sale
 */

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics-events";
import { utmParams } from "@/lib/utm";

import { GUIDE_REF_STORAGE_KEY } from "@/lib/guide-attribution-inline";
export { guideRefDataAttrs } from "@/lib/guide-attribution-inline";

const KEY = GUIDE_REF_STORAGE_KEY;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SLUG = 120;
const MAX_SLOT = 60;

export type GuideLinkKind = "signature" | "studio" | "guide" | "contact" | "other";

export interface GuideRefSnapshot {
  guide_slug: string;
  slot: string;
  ts: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Compatibility helper. Internal guide links are now clean canonical URLs;
 * attribution is persisted at click time by `recordGuideLinkClick()`.
 * Returns an empty search object so any remaining caller stays crawl-clean.
 *
 * @deprecated Do not spread into `search` / `href` — it is intentionally empty.
 */
export function guideRefSearch(_guideSlug: string, _slot: string): Record<string, string> {
  return {};
}

/** Write the snapshot to both storages. Synchronous; never throws. */
function persistGuideRef(guideSlug: string, slot: string): GuideRefSnapshot | null {
  if (!isBrowser()) return null;
  const guide_slug = guideSlug.trim().slice(0, MAX_SLUG);
  if (!guide_slug) return null;
  const snap: GuideRefSnapshot = {
    guide_slug,
    slot: (slot.trim() || "unknown").slice(0, MAX_SLOT),
    ts: Date.now(),
  };
  const raw = JSON.stringify(snap);
  try {
    window.sessionStorage.setItem(KEY, raw);
  } catch {
    /* private mode — silent */
  }
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* private mode — silent */
  }
  return snap;
}

/**
 * Legacy support: read `?ref=guide:<slug>&ref_slot=<slot>` from the URL and
 * persist it. New internal links no longer carry these params; this only
 * serves old shared / bookmarked URLs. Returns the freshest known snapshot.
 */
export function captureGuideRefFromLocation(): GuideRefSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const params = new URL(window.location.href).searchParams;
    const ref = params.get("ref") ?? "";
    if (!ref.startsWith("guide:")) return getGuideRef();
    const guideSlug = ref.slice("guide:".length);
    if (!guideSlug) return getGuideRef();
    return persistGuideRef(guideSlug, params.get("ref_slot") ?? "unknown") ?? getGuideRef();
  } catch {
    return null;
  }
}

function read(storage: Storage | undefined): GuideRefSnapshot | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuideRefSnapshot;
    if (!parsed?.guide_slug) return null;
    if (parsed.ts && Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Freshest known guide referral (session wins over the 30-day window). */
export function getGuideRef(): GuideRefSnapshot | null {
  if (!isBrowser()) return null;
  return read(window.sessionStorage) ?? read(window.localStorage);
}

/**
 * Flat metadata for checkout. Merges the guide referral with the real UTM
 * acquisition snapshot; values are short and never contain personal data.
 */
export function guideAttributionMetadata(): Record<string, string> {
  const out: Record<string, string> = {};
  const guide = getGuideRef();
  if (guide) {
    out.guide_slug = guide.guide_slug;
    out.guide_slot = guide.slot;
  }
  for (const [k, v] of Object.entries(utmParams())) out[k] = String(v).slice(0, 200);
  return out;
}

export interface GuideLinkClick {
  guideSlug: string;
  slot: string;
  kind: GuideLinkKind;
  destination: string;
}

/**
 * Click-time attribution. Called from a link's `onClick` BEFORE navigation:
 *   1. persists the guide/slot snapshot synchronously (this is what checkout
 *      later reads — it replaces the old `?ref=` query string)
 *   2. fires a GA4 event and an internal `guide_link_clicks` row, both
 *      fire-and-forget
 *
 * Never touches the event, never calls preventDefault, never throws — the
 * native / router navigation always proceeds.
 */
export function recordGuideLinkClick(click: GuideLinkClick): void {
  if (!isBrowser()) return;
  persistGuideRef(click.guideSlug, click.slot);
  try {
    trackEvent("guide_link_click", {
      placement: click.slot,
      guide_slug: click.guideSlug,
      destination: click.destination,
      destination_kind: click.kind,
    });
  } catch {
    /* analytics must never break navigation */
  }
  try {
    void supabase
      .from("guide_link_clicks")
      .insert({
        guide_slug: click.guideSlug.slice(0, MAX_SLUG),
        slot: click.slot.slice(0, MAX_SLOT),
        destination: click.destination.slice(0, 240),
        destination_kind: click.kind,
        page_path: window.location.pathname.slice(0, 240),
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* offline / blocked — the GA4 event still carries the signal */
  }
}
