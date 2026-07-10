/**
 * GA4 ecommerce dataLayer helpers — GTM-M82SQS79.
 *
 * Every helper follows the GA4-recommended pattern:
 *   1. dataLayer.push({ ecommerce: null })   // reset previous ecommerce
 *   2. dataLayer.push({ event, ecommerce })  // real event + payload
 *
 * All calls are SSR/test-safe no-ops. They never throw, never block.
 * Uses exact GA4 event names (view_item, add_to_cart, begin_checkout,
 * add_payment_info, purchase, generate_lead) plus two custom Studio
 * events (studio_start, studio_step).
 */

import type { SignatureTour } from "@/data/signatureTours";

export interface GA4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  currency?: string;
}

interface DataLayerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isTest(): boolean {
  return typeof process !== "undefined" && !!process.env?.VITEST;
}

/**
 * Core push — always resets `ecommerce` first, then pushes the event.
 * Exported for tests; call sites should use the typed helpers below.
 */
export function pushEcommerce(event: string, ecommerce: Record<string, unknown>): void {
  if (!isBrowser() || isTest()) return;
  const w = window as DataLayerWindow;
  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event, ecommerce });
  } catch {
    /* silent */
  }
}

/** Non-ecommerce dataLayer push (studio_start / studio_step / generate_lead). */
function pushEvent(event: string, params: Record<string, unknown>): void {
  if (!isBrowser() || isTest()) return;
  const w = window as DataLayerWindow;
  try {
    w.dataLayer = w.dataLayer ?? [];
    // Reset ecommerce even for non-ecommerce events so a stale ecommerce
    // object never leaks into unrelated tag contexts.
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event, ...params });
  } catch {
    /* silent */
  }
}

/* ─────────────────────────── item builders ─────────────────────────── */

const BRAND = "YES Experiences Portugal";

export function buildTourItem(
  tour: Pick<SignatureTour, "id" | "title" | "priceFrom">,
  opts: { quantity?: number; tier?: string; itemCategory?: "Signature" | "Studio" } = {},
): GA4Item {
  return {
    item_id: tour.id,
    item_name: tour.title,
    item_brand: BRAND,
    item_category: opts.itemCategory ?? "Signature",
    item_variant: opts.tier,
    price: Number(tour.priceFrom) || 0,
    quantity: Math.max(1, opts.quantity ?? 1),
    currency: "EUR",
  };
}

/* ─────────────────────────── event helpers ─────────────────────────── */

/** GA4: view_item — fired on /tours/* page load. */
export function gaViewItem(args: {
  tour: Pick<SignatureTour, "id" | "title" | "priceFrom">;
}): void {
  const item = buildTourItem(args.tour, { quantity: 1, itemCategory: "Signature" });
  pushEcommerce("view_item", {
    currency: "EUR",
    value: item.price,
    items: [item],
  });
}

/** Custom: studio_start — Begin click on /studio-v3. */
export function gaStudioStart(): void {
  pushEvent("studio_start", {});
}

/** Custom: studio_step — fired on each configurator step enter. */
export function gaStudioStep(args: {
  stepNumber: number;
  stepKey: string;
  qualityScore: number | null;
}): void {
  pushEvent("studio_step", {
    step_number: args.stepNumber,
    step_name: args.stepKey,
    quality_score: args.qualityScore,
  });
}

/** GA4: add_to_cart — Signature Reserve click. */
export function gaAddToCartSignature(args: {
  tour: Pick<SignatureTour, "id" | "title" | "priceFrom">;
  guests: number;
  perPaxEur?: number;
}): void {
  const price = args.perPaxEur ?? (Number(args.tour.priceFrom) || 0);
  const item: GA4Item = {
    ...buildTourItem(args.tour, {
      quantity: args.guests,
      tier: "signature",
      itemCategory: "Signature",
    }),
    price,
  };
  pushEcommerce("add_to_cart", {
    currency: "EUR",
    value: price * item.quantity,
    items: [item],
    tier: "signature",
  });
}

/** GA4: add_to_cart — Studio tier explicitly chosen. */
export function gaAddToCartStudioTier(args: {
  tier: string;
  priceEur: number;
  quantity?: number;
  tourId?: string | null;
  tourTitle?: string | null;
}): void {
  const qty = Math.max(1, args.quantity ?? 1);
  const item: GA4Item = {
    item_id: args.tourId ?? `studio-${args.tier}`,
    item_name: args.tourTitle ?? `Studio — ${args.tier}`,
    item_brand: BRAND,
    item_category: "Studio",
    item_variant: args.tier,
    price: args.priceEur,
    quantity: qty,
    currency: "EUR",
  };
  pushEcommerce("add_to_cart", {
    currency: "EUR",
    value: args.priceEur * qty,
    items: [item],
    tier: args.tier,
  });
}

/** GA4: begin_checkout — right before Stripe redirect / embedded init. */
export function gaBeginCheckout(args: { items: GA4Item[]; valueEur: number }): void {
  pushEcommerce("begin_checkout", {
    currency: "EUR",
    value: args.valueEur,
    items: args.items,
  });
}

/** GA4: add_payment_info — payment surface reached. */
export function gaAddPaymentInfo(args: {
  paymentType: string;
  items: GA4Item[];
  valueEur: number;
}): void {
  pushEcommerce("add_payment_info", {
    currency: "EUR",
    value: args.valueEur,
    payment_type: args.paymentType,
    items: args.items,
  });
}

/** GA4: purchase — confirmation. */
export function gaPurchase(args: {
  transactionId: string;
  valueEur: number;
  items: GA4Item[];
  currency?: string;
}): void {
  pushEcommerce("purchase", {
    transaction_id: args.transactionId,
    currency: args.currency ?? "EUR",
    value: args.valueEur,
    items: args.items,
  });
}

/** GA4: generate_lead — contact / WhatsApp / tailor "Talk to a local". */
export function gaGenerateLead(args: {
  leadSource: string;
  method: string;
  requestType?: string;
}): void {
  pushEvent("generate_lead", {
    lead_source: args.leadSource,
    method: args.method,
    ...(args.requestType ? { request_type: args.requestType } : {}),
  });
}
