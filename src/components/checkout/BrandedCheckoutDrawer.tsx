import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Lock, X, MapPin, Clock, Users, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CredentialStrip } from "@/components/ui/CredentialStrip";
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
          {/* Trust row — conversion-focused: three claims true across the
              brand (see booking-truth-model memory: TEST MODE + free
              cancellation policy + payments encrypted). Sits right under
              the title so the guest sees them before the payment iframe
              paints. */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="w-1 h-1 rounded-full bg-[color:var(--gold)]" />
              {CANCELLATION.signature.en}
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="w-1 h-1 rounded-full bg-[color:var(--gold)]" />
              Instant confirmation
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="w-1 h-1 rounded-full bg-[color:var(--gold)]" />
              Secure payment
            </li>
          </ul>
        </div>

        {/* Credential microstrip — operator legitimacy above the summary,
             lands before doubt. Reviews/popularity are covered elsewhere. */}
        <div className="px-5 sm:px-7 py-2.5 border-b border-[color:var(--border)] bg-[color:var(--ivory)]">
          <CredentialStrip variant="light" compact />
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

function ExperienceSummaryCard({
  summary,
  total,
}: {
  summary: CheckoutSummary;
  total: number | null;
}) {
  return (
    <div className="px-5 sm:px-7 pt-5 pb-6 border-b border-[color:var(--border)] bg-[color:var(--sand)]/30">
      <div className="flex gap-4">
        {summary.heroSrc ? (
          <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 overflow-hidden">
            <img
              src={summary.heroSrc}
              alt=""
              aria-hidden
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 ring-1 ring-[color:var(--gold)]/40" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
            Your day
          </p>
          <h3 className="serif text-[1.05rem] leading-snug text-[color:var(--charcoal)] mt-1 truncate">
            {summary.tourTitle}
          </h3>
          <ul className="mt-2.5 space-y-1 text-[12.5px] text-[color:var(--charcoal-soft)]">
            {summary.region ? <Meta icon={<MapPin size={11} />}>{summary.region}</Meta> : null}
            {summary.durationHours ? (
              <Meta icon={<Clock size={11} />}>{summary.durationHours}h</Meta>
            ) : null}
            {summary.dateExact ? (
              <Meta icon={<Calendar size={11} />}>
                {formatDate(summary.dateExact)}
                {summary.startTime ? ` · ${summary.startTime}` : ""}
              </Meta>
            ) : null}
            <Meta icon={<Users size={11} />}>
              {summary.adults != null && summary.minorAges
                ? buildCompositionLine(summary.adults, summary.minorAges, summary.guests)
                : `${summary.guests} guest${summary.guests > 1 ? "s" : ""}`}
            </Meta>
          </ul>
        </div>
      </div>

      {summary.beats && summary.beats.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-1.5">
          {summary.beats.map((b) => (
            <li
              key={b}
              className="flex gap-2 text-[12.5px] leading-snug text-[color:var(--charcoal)]"
            >
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[color:var(--gold)] shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {hasCompleteJourneyPricing(summary.journeyLines) ? (
        <div
          className="mt-4 pt-3 border-t border-[color:var(--border)]"
          data-testid="checkout-drawer-journey-lines"
        >
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
            Travellers
          </p>
          <ul className="mt-2 space-y-1">
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

      {summary.addOns && summary.addOns.length > 0 ? (
        <div className="mt-4 pt-3 border-t border-[color:var(--border)]">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
            Add-ons
          </p>
          <ul className="mt-2 space-y-1">
            {summary.addOns.map((a) => {
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

      {total != null ? (
        <div
          className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-baseline justify-between"
          data-testid="checkout-drawer-total"
        >
          <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
            Total
          </span>
          <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
            €{total.toLocaleString("en-GB")}
            {hasCompleteJourneyPricing(summary.journeyLines) ? null : summary.pricePerPaxEur !=
                null &&
              summary.guests > 1 &&
              (summary.minorAges?.length ?? 0) === 0 ? (
              <span className="ml-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans">
                €{Math.round(summary.pricePerPaxEur).toLocaleString("en-GB")} × {summary.guests}
              </span>
            ) : (summary.minorAges?.length ?? 0) > 0 ? (
              <span className="ml-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans">
                age-based pricing
              </span>
            ) : null}
          </span>
        </div>
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
