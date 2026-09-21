/**
 * Google "Things to do" / Merchant Center product feed for the 12 Signature
 * experiences.
 *
 * TRUTH RULES (do not violate):
 * - Every field comes from the shipped catalog (`signatureTours`) or the
 *   verified content source of truth (`getTourContent`). Nothing is invented.
 * - No ratings or review counts are exported. The in-app review numbers are
 *   not a verified first-party source, so they must never be sent to Google.
 * - `priceFromEur` is the published per-person "from" anchor; the feed marks
 *   it as a starting price, exactly as the tour page does.
 * - Availability is "in stock" only in the sense that dates are bookable on
 *   request/instant confirmation; no fixed public departure times are claimed.
 */

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { getTourContent } from "@/lib/tourContent";
import { abs } from "@/lib/seo";

export const FEED_BRAND = "YES experiences Portugal";
export const FEED_CURRENCY = "EUR";

export type ThingsToDoProduct = {
  /** Stable feed id — the tour slug. */
  id: string;
  title: string;
  description: string;
  /** Absolute landing page on our own site (direct booking, no OTA). */
  url: string;
  /** Absolute image URLs — hero first, then real gallery photos. */
  images: string[];
  priceFromEur: number;
  currency: string;
  /** Human duration label, e.g. "7–9h". */
  durationLabel: string;
  /** ISO-8601 duration built from the minimum of the published range. */
  durationIso: string | null;
  region: string;
  /** Verified highlights — the same list the experience page shows. */
  highlights: string[];
  included: string[];
  /** Private group tour: the day runs for one party only. */
  privateTour: true;
  language: "en";
  country: "PT";
};

/** "7–9h" → 7 · "7h30" → 7.5 · "Full Day" → null */
export function minDurationHours(durationHours: string): number | null {
  const normalized = durationHours.replace(/[–—]/g, "-");
  const range = normalized.match(/(\d+)(?:h(\d{2}))?/);
  if (!range) return null;
  const hours = Number(range[1]);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  const minutes = range[2] ? Number(range[2]) : 0;
  return minutes > 0 ? hours + minutes / 60 : hours;
}

export function isoDuration(durationHours: string): string | null {
  const hours = minDurationHours(durationHours);
  if (hours == null) return null;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes > 0 ? `PT${whole}H${minutes}M` : `PT${whole}H`;
}

function productFor(tour: SignatureTour): ThingsToDoProduct {
  const content = getTourContent(tour.id);
  // Canonical content only — getTourContent() already falls back to the
  // legacy tour fields internally, so the output is unchanged.
  const highlights = content.highlights;
  const images = Array.from(new Set([tour.img, ...(tour.gallery ?? [])].filter(Boolean))).map(
    (src) => abs(src),
  );
  return {
    id: tour.id,
    title: tour.title,
    description: tour.blurb,
    url: abs(`/tours/${tour.id}`),
    images,
    priceFromEur: tour.priceFrom,
    currency: FEED_CURRENCY,
    durationLabel: tour.durationHours,
    durationIso: isoDuration(tour.durationHours),
    region: tour.region,
    highlights: highlights.slice(0, 8),
    included: tour.included.slice(0, 12),
    privateTour: true,
    language: "en",
    country: "PT",
  };
}

export function buildThingsToDoProducts(): ThingsToDoProduct[] {
  return signatureTours.map(productFor);
}

/** Feed-readiness check. Empty array = every product satisfies Google's
 *  required fields for a bookable activity listing. */
export function validateThingsToDoFeed(products: ThingsToDoProduct[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (seen.has(p.id)) issues.push(`${p.id}: duplicate feed id`);
    seen.add(p.id);
    if (!/^https:\/\/yesexperiencesportugal\.com\/tours\//.test(p.url))
      issues.push(`${p.id}: landing page is not an absolute canonical tour URL`);
    if (p.images.length === 0) issues.push(`${p.id}: no image`);
    if (p.images.some((src) => !/^https:\/\//.test(src)))
      issues.push(`${p.id}: image URL is not absolute`);
    if (!(p.priceFromEur > 0)) issues.push(`${p.id}: missing price`);
    if (!p.durationIso) issues.push(`${p.id}: duration could not be resolved`);
    if (p.description.trim().length < 60) issues.push(`${p.id}: description too short`);
    if (p.title.trim().length < 10) issues.push(`${p.id}: title too short`);
    if (p.highlights.length === 0) issues.push(`${p.id}: no verified highlights`);
    if (p.included.length === 0) issues.push(`${p.id}: no inclusions`);
  }
  return issues;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * RSS 2.0 product feed with the Google (`g:`) namespace — the format Google
 * Merchant Center / Things to do accepts for a direct (non-OTA) integration.
 */
export function thingsToDoRss(products: ThingsToDoProduct[]): string {
  const items = products.map((p) =>
    [
      `    <item>`,
      `      <g:id>${esc(p.id)}</g:id>`,
      `      <g:title>${esc(p.title)}</g:title>`,
      `      <g:description>${esc(p.description)}</g:description>`,
      `      <g:link>${esc(p.url)}</g:link>`,
      ...p.images.map((src, i) =>
        i === 0
          ? `      <g:image_link>${esc(src)}</g:image_link>`
          : `      <g:additional_image_link>${esc(src)}</g:additional_image_link>`,
      ),
      `      <g:availability>in_stock</g:availability>`,
      `      <g:price>${p.priceFromEur.toFixed(2)} ${p.currency}</g:price>`,
      `      <g:brand>${esc(FEED_BRAND)}</g:brand>`,
      `      <g:condition>new</g:condition>`,
      `      <g:identifier_exists>no</g:identifier_exists>`,
      `      <g:google_product_category>5710</g:google_product_category>`,
      `      <g:product_type>Private day tours &gt; ${esc(p.region)}</g:product_type>`,
      `      <g:content_language>${p.language}</g:content_language>`,
      `      <g:target_country>${p.country}</g:target_country>`,
      p.durationIso
        ? `      <g:custom_label_0>duration:${esc(p.durationIso)}</g:custom_label_0>`
        : null,
      `      <g:custom_label_1>region:${esc(p.region)}</g:custom_label_1>`,
      `      <g:custom_label_2>private-tour</g:custom_label_2>`,
      `    </item>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${esc(FEED_BRAND)} — Signature private experiences</title>`,
    `    <link>https://yesexperiencesportugal.com</link>`,
    `    <description>Private day experiences in Portugal, bookable directly at yesexperiencesportugal.com.</description>`,
    ...items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}
