import { useEffect, useMemo, useRef, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Eyebrow } from "@/components/ui/Eyebrow";

import { CANCELLATION } from "@/config/business-nap";
import {
  summarizeJourneyLines as summarizeJourneyLinesShared,
  hasCompleteJourneyPricing,
  type CheckoutJourneyLine as SharedJourneyLine,
  type JourneyBand as SharedJourneyBand,
} from "@/lib/checkout/journeyDisplay";

// Re-exports so existing importers keep working.
export type JourneyBand = SharedJourneyBand;
export type CheckoutJourneyLine = SharedJourneyLine;
export const summarizeJourneyLines = summarizeJourneyLinesShared;

/**
 * BrandedCheckoutDrawer
 *
 * Renders Stripe Embedded Checkout inside an ivory, brand-styled drawer
 * (right side on desktop / bottom sheet on mobile). A premium experience
 * summary sits above the iframe so the guest always sees what they're
 * paying for. No full-page redirect — checkout happens on our domain.
 */

export interface CheckoutAddOnLine {
  id: string;
  label: string;
  /** Legacy per-person anchor (back-compat). */
  priceEur: number;
  durationMinutes: number;
  /** Unit-aware per-unit price. */
  perUnit?: number;
  /** Unit-aware line total for the current party. */
  amount?: number;
  /** How the add-on is billed. */
  unit?: "per_person" | "per_group" | "per_vehicle" | "fixed";
  /** Human unit label (e.g. "per guest", "per group"). */
  unitLabel?: string;
}

export interface CheckoutSummary {
  tourTitle: string;
  region?: string;
  durationHours?: string | number;
  /** Total headcount (adults + minorAges.length). */
  guests: number;
  /** Adults 18+ — required when the summary carries a composition breakdown. */
  adults?: number;
  /** Exact integer ages per minor (0..17). Empty when adults-only. */
  minorAges?: readonly number[];
  dateExact?: string | null;
  startTime?: string | null;
  pickupLabel?: string | null;
  pricePerPaxEur?: number | null;
  /** Total in EUR. Optional — derived from journey/add-ons when missing. */
  totalEur?: number | null;
  /** Optional hero image (locally uploaded YES photo when available). */
  heroSrc?: string | null;
  /** Short list (max 4) of inclusions / signature beats. */
  beats?: string[];
  flowLabel?: "Signature" | "Tailored" | "Studio";
  /** Selected reveal add-ons, kept in sync with SignaturePriceCard. */
  addOns?: CheckoutAddOnLine[];
  /** Legacy per-person sum of add-ons (back-compat). */
  addOnsTotalEur?: number;
  /** Unit-aware party total for add-ons (preferred when present). */
  addOnsPartyTotalEur?: number;
  /**
   * Canonical age-banded lines from `resolveJourneyPricing`. When present,
   * the drawer renders one row per traveller and derives the total from
   * these lines — never from pricePerPaxEur × guests.
   */
  journeyLines?: readonly CheckoutJourneyLine[];
  /** Sum of journeyLines[].unitEur; supplied alongside journeyLines. */
  journeyTotalEur?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string | null;
  publishableKey: string | null;
  summary: CheckoutSummary;
  /** Called when Stripe reports the session as complete. */
  onComplete?: (sessionId: string | null) => void;
}

// One Stripe instance per publishable key (memoized across drawer opens).
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string): Promise<Stripe | null> {
  if (!pk) return Promise.resolve(null);
  const cached = stripeCache.get(pk);
  if (cached) return cached;
  const p = loadStripe(pk);
  stripeCache.set(pk, p);
  return p;
}

/** Eager-prewarm Stripe.js so the drawer opens instantly. Call this on
 * intent (e.g. when FinalDetailsDialog opens). */
export function prewarmStripe(publishableKey: string | undefined | null) {
  if (publishableKey) void getStripePromise(publishableKey);
}

/** Inject the Stripe.js script tag once so the network/parse cost is
 * paid in parallel with the edge-function round-trip. Safe to call
 * repeatedly. */
let stripeScriptInjected = false;
export function prewarmStripeScript() {
  if (stripeScriptInjected || typeof document === "undefined") return;
  if (document.querySelector('script[src^="https://js.stripe.com/v3"]')) {
    stripeScriptInjected = true;
    return;
  }
  const s = document.createElement("script");
  s.src = "https://js.stripe.com/v3/";
  s.async = true;
  document.head.appendChild(s);
  stripeScriptInjected = true;
}

export function BrandedCheckoutDrawer({
  open,
  onOpenChange,
  clientSecret,
  publishableKey,
  summary,
  onComplete,
}: Props) {
  const stripePromise = useMemo(
    () => (publishableKey ? getStripePromise(publishableKey) : null),
    [publishableKey],
  );

  const completeFiredRef = useRef(false);

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      onComplete: () => {
        if (completeFiredRef.current) return;
        completeFiredRef.current = true;
        const sid = new URLSearchParams(window.location.search).get("session_id");
        onComplete?.(sid);
      },
    };
  }, [clientSecret, onComplete]);

  useEffect(() => {
    if (open) completeFiredRef.current = false;
  }, [open]);

  const addOnsPartyTotal =
    summary.addOnsPartyTotalEur ??
    (summary.addOns
      ? summary.addOns.reduce((s, a) => {
          if (a.amount != null) return s + a.amount;
          // Legacy fallback: per_person default → multiply by guests.
          return s + a.priceEur * summary.guests;
        }, 0)
      : (summary.addOnsTotalEur ?? 0));

  const total = (() => {
    if (summary.totalEur != null && Number.isFinite(summary.totalEur)) return summary.totalEur;
    // Only trust journeyTotalEur when the underlying journey lines are
    // fully populated — otherwise the number could reflect an incomplete
    // composition (missing minor age) and would mismatch the itemised rows.
    if (
      summary.journeyTotalEur != null &&
      Number.isFinite(summary.journeyTotalEur) &&
      hasCompleteJourneyPricing(summary.journeyLines)
    ) {
      return Math.round(summary.journeyTotalEur + addOnsPartyTotal);
    }
    if (summary.pricePerPaxEur != null && Number.isFinite(summary.pricePerPaxEur)) {
      return Math.round(summary.pricePerPaxEur * summary.guests + addOnsPartyTotal);
    }
    return null;
  })();

  useEffect(() => {
    if (open) prewarmStripeScript();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 bg-[color:var(--ivory)] border-l border-[color:var(--border)] flex flex-col gap-0 [&>button.absolute]:hidden"
        data-checkout="embedded"
      >
        {/* Header */}
        <div className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-[color:var(--border)] bg-[color:var(--ivory)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close checkout"
            className="absolute top-4 right-4 p-2 text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <X size={18} />
          </button>
          <Eyebrow>Step 2 of 2 · {summary.flowLabel ?? "Signature"} · Payment</Eyebrow>
          <SheetTitle className="serif text-[1.35rem] leading-tight text-[color:var(--charcoal)] mt-2 font-normal">
            {summary.tourTitle}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Secure checkout for {summary.tourTitle}.
          </SheetDescription>
          {/* Payment surface: one quiet reassurance line only. Cancellation
              and credentials are decision-surface content, shown before the
              guest reaches payment. */}
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
            {CANCELLATION.signature.en} · Instant confirmation
          </p>
        </div>


        <div className="overflow-y-auto flex-1">
          {/* Premium experience summary card */}
          <ExperienceSummaryCard summary={summary} total={total} />

          {/* Stripe Embedded Checkout */}
          <div className="px-2 sm:px-3 pb-6">
            {clientSecret && publishableKey && stripePromise && options ? (
              <div className="relative bg-white">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              <CheckoutSkeleton />
            )}
          </div>
        </div>

        {/* Trust footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-[color:var(--border)] bg-[color:var(--sand)]/40">
          <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            <Lock size={11} /> Secure checkout · 256-bit encrypted
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Compact payment summary: date + party on one line, total prominent,
 * and everything else (traveller bands, add-ons, day beats) behind a
 * single `Details` disclosure so Stripe paints immediately below.
 * Hero, region and duration are decision-surface content and are not
 * rendered here.
 */
function ExperienceSummaryCard({
  summary,
  total,
}: {
  summary: CheckoutSummary;
  total: number | null;
}) {
  const [open, setOpen] = useState(false);

  const partyLine =
    summary.adults != null && summary.minorAges
      ? buildCompositionLine(summary.adults, summary.minorAges, summary.guests)
      : `${summary.guests} guest${summary.guests > 1 ? "s" : ""}`;

  const metaLine = [
    summary.dateExact
      ? `${formatDate(summary.dateExact)}${summary.startTime ? ` · ${summary.startTime}` : ""}`
      : null,
    partyLine,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasBands = hasCompleteJourneyPricing(summary.journeyLines);
  const hasAddOns = !!summary.addOns && summary.addOns.length > 0;
  const hasBeats = !!summary.beats && summary.beats.length > 0;
  const hasDetails = hasBands || hasAddOns || hasBeats;

  return (
    <div
      className="px-5 sm:px-7 pt-4 pb-3 border-b border-[color:var(--border)] bg-[color:var(--sand)]/30"
      data-testid="checkout-drawer-summary"
    >
      <p
        className="text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]"
        data-testid="checkout-drawer-meta"
      >
        {metaLine}
      </p>

      {total != null ? (
        <div
          className="mt-2 flex items-baseline justify-between gap-3"
          data-testid="checkout-drawer-total"
        >
          <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
            Total
          </span>
          <span className="serif text-[1.5rem] leading-none text-[color:var(--charcoal)]">
            €{total.toLocaleString("en-GB")}
          </span>
        </div>
      ) : null}

      {hasDetails ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-testid="checkout-drawer-details-toggle"
            className="mt-1 flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <span>Details</span>
            <ChevronDown
              size={14}
              aria-hidden
              className={open ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          {open ? (
            <div className="pb-2" data-testid="checkout-drawer-details">
              {hasBands ? (
                <div
                  className="pt-1 border-t border-[color:var(--border)]"
                  data-testid="checkout-drawer-journey-lines"
                >
                  <p className="mt-2 text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
                    Travellers
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {summarizeJourneyLines(summary.journeyLines!).map((row) => (
                      <li
                        key={row.key}
                        className="flex items-baseline justify-between gap-3 text-[12px] text-[color:var(--charcoal)] font-sans"
                      >
                        <span className="truncate">
                          {row.label}
                          {row.qty > 1 ? (
                            <span className="ml-1 text-[color:var(--charcoal-soft)]">
                              (€{Math.round(row.unitEur).toLocaleString("en-GB")} × {row.qty})
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-[color:var(--charcoal-soft)]">
                          €{Math.round(row.subtotalEur).toLocaleString("en-GB")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hasAddOns ? (
                <div className="mt-3 pt-2 border-t border-[color:var(--border)]">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
                    Add-ons
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {summary.addOns!.map((a) => {
                      const lineAmount = a.amount != null ? a.amount : a.priceEur * summary.guests;
                      const perUnit = a.perUnit != null ? a.perUnit : a.priceEur;
                      const isPerPerson = a.unit == null || a.unit === "per_person";
                      return (
                        <li
                          key={a.id}
                          className="flex items-baseline justify-between gap-3 text-[12px] text-[color:var(--charcoal)] font-sans"
                        >
                          <span className="truncate">
                            • {a.label}
                            {isPerPerson && summary.guests > 1 ? (
                              <span className="ml-1 text-[color:var(--charcoal-soft)]">
                                (€{Math.round(perUnit).toLocaleString("en-GB")} × {summary.guests})
                              </span>
                            ) : a.unitLabel ? (
                              <span className="ml-1 text-[color:var(--charcoal-soft)]">
                                ({a.unitLabel})
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums text-[color:var(--charcoal-soft)]">
                            €{Math.round(lineAmount).toLocaleString("en-GB")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {hasBeats ? (
                <ul className="mt-3 pt-2 border-t border-[color:var(--border)] space-y-1">
                  {summary.beats!.slice(0, 4).map((b) => (
                    <li
                      key={b}
                      className="flex gap-2 text-[12px] leading-snug text-[color:var(--charcoal)]"
                    >
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[color:var(--gold)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}


function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-[color:var(--gold)]">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
  } catch {
    return iso;
  }
}

/** Format e.g. `4 guests · 2 adults · children aged 8 and 13`. Kept
 *  local so the drawer doesn't take a dep on `@/lib/checkout/composition`
 *  when the summary is populated by legacy callers without a composition. */
function buildCompositionLine(adults: number, minorAges: readonly number[], total: number): string {
  const parts = [
    `${total} guest${total === 1 ? "" : "s"}`,
    `${adults} adult${adults === 1 ? "" : "s"}`,
  ];
  if (minorAges.length > 0) {
    const ages = [...minorAges];
    let agesLabel: string;
    if (ages.length === 1) agesLabel = `aged ${ages[0]}`;
    else if (ages.length === 2) agesLabel = `aged ${ages[0]} and ${ages[1]}`;
    else agesLabel = `aged ${ages.slice(0, -1).join(", ")} and ${ages[ages.length - 1]}`;
    parts.push(`${ages.length === 1 ? "child" : "children"} ${agesLabel}`);
  }
  return parts.join(" · ");
}

function CheckoutSkeleton() {
  return (
    <div className="px-3 py-6 space-y-3" aria-hidden>
      <div className="h-10 bg-[color:var(--sand)]/60 animate-pulse" />
      <div className="h-32 bg-[color:var(--sand)]/60 animate-pulse" />
      <div className="h-10 bg-[color:var(--sand)]/60 animate-pulse" />
      <p className="text-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] pt-2">
        Preparing secure checkout…
      </p>
    </div>
  );
}
