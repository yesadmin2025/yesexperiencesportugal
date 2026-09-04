/**
 * Guide attribution — which Journal guide sent a reader to a booking.
 *
 * Internal links are tagged with `ref` / `ref_slot` (NOT utm_*) on purpose:
 * overwriting utm_source on an internal hop would destroy the original
 * acquisition source (Google, a newsletter, a partner blog). The real UTM
 * snapshot in `utm.ts` stays untouched and is carried alongside, so a
 * booking can be read as "came from Google → read the Arrábida guide →
 * booked".
 *
 * Three jobs:
 *   1. tag internal guide → tour/studio links
 *   2. capture + persist that tag on the destination page (30 days)
 *   3. hand the snapshot to checkout so Stripe metadata (and therefore the
 *      `bookings` row) records the guide that produced the sale
 */

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics-events";
import { utmParams } from "@/lib/utm";

const KEY = "yes.guideref.v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type GuideLinkKind = "signature" | "studio" | "guide" | "contact" | "other";

export interface GuideRefSnapshot {
  guide_slug: string;
  slot: string;
  ts: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Search params to attach to an internal link leaving a guide. */
export function guideRefSearch(guideSlug: string, slot: string): Record<string, string> {
  return { ref: `guide:${guideSlug}`, ref_slot: slot };
}

/** Read `?ref=guide:<slug>&ref_slot=<slot>` from the URL and persist it. */
export function captureGuideRefFromLocation(): GuideRefSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const params = new URL(window.location.href).searchParams;
    const ref = params.get("ref") ?? "";
    if (!ref.startsWith("guide:")) return getGuideRef();
    const guide_slug = ref.slice("guide:".length).slice(0, 120);
    if (!guide_slug) return getGuideRef();
    const snap: GuideRefSnapshot = {
      guide_slug,
      slot: (params.get("ref_slot") ?? "unknown").slice(0, 60),
      ts: Date.now(),
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snap));
      window.sessionStorage.setItem(KEY, JSON.stringify(snap));
    } catch {
      /* private mode — silent */
    }
    return snap;
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

/** Fire-and-forget click record: internal table + GA4 event. Never throws. */
export function recordGuideLinkClick(click: GuideLinkClick): void {
  if (!isBrowser()) return;
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
        guide_slug: click.guideSlug.slice(0, 120),
        slot: click.slot.slice(0, 60),
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
