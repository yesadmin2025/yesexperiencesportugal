// Validate + normalise the client-sent quote snapshot before we sign it.
// The signed token becomes the source of truth for Stripe metadata, so any
// untrusted field must be bounded and sanitised here.

import {
  STUDIO_COMMERCIAL_PRODUCT_KEYS,
  type StudioCommercialProductKey,
} from "./studioCommercialPricing.ts";
import { listServerAddOnIds } from "./signatureAddOnCatalogue.ts";

const SUPPORTED_LANGUAGES = ["en", "pt", "es", "other"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const ROUTE_STATUSES = ["validated", "pending-review", "unavailable"] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export interface RawQuoteSnapshot {
  commercialProductKey?: unknown;
  signatureId?: unknown;
  title?: unknown;
  destinationRegion?: unknown;
  pickupCity?: unknown;
  date?: unknown;
  startTime?: unknown;
  language?: unknown;
  guests?: unknown;
  routeStops?: unknown;
  selectedAddOns?: unknown;
  routeStatus?: unknown;
  // client-sent inclusionIds are intentionally ignored (server-resolved)
  inclusionIds?: unknown;
}

export interface NormalisedSnapshot {
  commercialProductKey: StudioCommercialProductKey;
  signatureId: string;
  title: string;
  destinationRegion: string;
  pickupCity: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  language: SupportedLanguage;
  guests: number;
  routeStops: Array<{ id: string; label: string }>;
  selectedAddOns: Array<{ id: string; quantity: number }>;
  routeStatus: RouteStatus;
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

function sanitiseText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}
function isHHMM(v: string): boolean {
  return /^\d{2}:\d{2}$/.test(v);
}

export class SnapshotValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "SnapshotValidationError";
  }
}

export function validateAndNormaliseSnapshot(raw: RawQuoteSnapshot): NormalisedSnapshot {
  if (!raw || typeof raw !== "object") throw new SnapshotValidationError("snapshot missing");

  const commercialProductKey = raw.commercialProductKey;
  if (
    typeof commercialProductKey !== "string" ||
    !(STUDIO_COMMERCIAL_PRODUCT_KEYS as readonly string[]).includes(commercialProductKey)
  ) {
    throw new SnapshotValidationError("invalid commercialProductKey");
  }

  const signatureId = sanitiseText(raw.signatureId, 80);
  if (!signatureId) throw new SnapshotValidationError("missing signatureId");

  const title = sanitiseText(raw.title, 120);
  if (!title) throw new SnapshotValidationError("missing title");

  const destinationRegion = sanitiseText(raw.destinationRegion, 80);
  const pickupCity = sanitiseText(raw.pickupCity, 80);

  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  if (!isIsoDate(date)) throw new SnapshotValidationError("invalid date");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (new Date(date + "T00:00:00Z").getTime() < today.getTime()) {
    throw new SnapshotValidationError("date is in the past");
  }

  const startTime = typeof raw.startTime === "string" ? raw.startTime.trim() : "09:00";
  if (!isHHMM(startTime)) throw new SnapshotValidationError("invalid startTime");

  const language = raw.language as SupportedLanguage;
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new SnapshotValidationError("unsupported language");
  }

  const guests = raw.guests;
  if (!Number.isInteger(guests) || (guests as number) < 1 || (guests as number) > 20) {
    throw new SnapshotValidationError("guests out of range");
  }

  if (!Array.isArray(raw.routeStops) || raw.routeStops.length < 1 || raw.routeStops.length > 12) {
    throw new SnapshotValidationError("routeStops out of range");
  }
  const seenStopIds = new Set<string>();
  const routeStops = raw.routeStops.map((s, i) => {
    if (!s || typeof s !== "object") throw new SnapshotValidationError(`stop ${i} invalid`);
    const id = sanitiseText((s as { id?: unknown }).id, 64);
    const label = sanitiseText((s as { label?: unknown }).label, 80);
    if (!id) throw new SnapshotValidationError(`stop ${i} missing id`);
    if (seenStopIds.has(id)) throw new SnapshotValidationError(`stop ${i} duplicate id`);
    seenStopIds.add(id);
    return { id, label };
  });

  const rawAddOns = Array.isArray(raw.selectedAddOns) ? raw.selectedAddOns : [];
  if (rawAddOns.length > 8) throw new SnapshotValidationError("too many add-ons");
  const knownAddOns = new Set(listServerAddOnIds());
  const selectedAddOns: Array<{ id: string; quantity: number }> = [];
  const seenAddOnIds = new Set<string>();
  for (const a of rawAddOns) {
    if (!a || typeof a !== "object") continue;
    const id = sanitiseText((a as { id?: unknown }).id, 64);
    if (!id || !knownAddOns.has(id) || seenAddOnIds.has(id)) continue;
    seenAddOnIds.add(id);
    const q = (a as { quantity?: unknown }).quantity;
    const quantity = Number.isInteger(q) && (q as number) >= 1 && (q as number) <= 20 ? (q as number) : 1;
    selectedAddOns.push({ id, quantity });
  }

  const routeStatus = raw.routeStatus;
  if (typeof routeStatus !== "string" || !(ROUTE_STATUSES as readonly string[]).includes(routeStatus)) {
    throw new SnapshotValidationError("invalid routeStatus");
  }

  return {
    commercialProductKey: commercialProductKey as StudioCommercialProductKey,
    signatureId,
    title,
    destinationRegion,
    pickupCity,
    date,
    startTime,
    language,
    guests: guests as number,
    routeStops,
    selectedAddOns,
    routeStatus: routeStatus as RouteStatus,
  };
}

/** Canonical JSON: keys sorted, no whitespace — for stable hashing. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) throw new Error("cycle");
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = walk((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}
