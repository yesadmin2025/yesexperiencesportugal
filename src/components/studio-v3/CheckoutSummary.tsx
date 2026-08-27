/**
 * CheckoutSummary — final step: tour summary on top, Stripe payment below.
 *
 * Summary card shows exactly five rows in this order: Date · Guests · Stops
 * · Add-ons · Total. No pricing math on this surface — totals come straight
 * from the props the refine page already resolved, so summary and refine
 * always match. Instant-confirmation language only.
 */

import * as React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import { findTour } from "@/data/signatureTours";
import { formatGuestComposition } from "./formatGuests";
import {
  CHECKOUT_HEADER,
  CTA_RESERVE_AND_PAY,
  INSTANT_CONFIRMATION,
} from "@/content/signature-day-copy";
import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";
import type { GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import { cn } from "@/lib/utils";
import { PriceBreakdownRows } from "@/components/checkout/PriceBreakdownRows";
import { PerPersonBands } from "@/components/checkout/PerPersonBands";

// One Stripe instance per publishable key, memoized across renders.
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(pk: string): Promise<Stripe | null> {
  if (!pk) return Promise.resolve(null);
  const cached = stripeCache.get(pk);
  if (cached) return cached;
  const p = loadStripe(pk);
  stripeCache.set(pk, p);
  return p;
}

export interface CheckoutSummaryProps {
  readonly state: StudioV3State;
  readonly guestDetails: GuestDetails;
  readonly selectedAddOns: SelectedAddOnSummary["items"];
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
  readonly adults?: number | null;
  readonly minorAges?: readonly number[];
  /**
   * Canonical age-banded per-traveller lines from `useResolvedJourney`.
   * When present, the summary itemises adults + each minor with the
   * band-adjusted unit price above the additions block.
   */
  readonly journeyLines?:
    | import("@/lib/checkout/journeyDisplay").CheckoutJourneyLine[]
    | readonly import("@/lib/checkout/journeyDisplay").CheckoutJourneyLine[]
    | null;
  /**
   * Stops the traveller was shown on refine. Same priority the reveal uses:
   * editedRoutePoints → composedStops → tour.stops. Guarantees the checkout
   * stops match the refine page exactly.
   */
  readonly composedStops?: ReadonlyArray<{ label: string }>;
  readonly submitting?: boolean;
  readonly onEditGuestDetails: () => void;
  readonly onBack: () => void;
  readonly onReserve: () => void;
  readonly clientSecret?: string | null;
  readonly publishableKey?: string | null;
  readonly onPaymentComplete?: (sessionId: string | null) => void;
  readonly className?: string;
  readonly testId?: string;
}

function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

export function CheckoutSummary({
  state,
  guestDetails,
  selectedAddOns,
  perPaxEur,
  totalEur,
  adults = null,
  minorAges = [],
  journeyLines = null,
  composedStops,
  submitting = false,
  onEditGuestDetails,
  onBack,
  onReserve,
  clientSecret = null,
  publishableKey = null,
  className,
  testId,
}: CheckoutSummaryProps) {
  // Last mile: the summary always opens at its own top. Arriving mid-scroll
  // from guest details hides the price line and reads as a broken step.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const [reserveAttempted, setReserveAttempted] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState(false);
  const wasSubmittingRef = React.useRef(false);

  // The parent owns the Stripe request. This surface can still tell whether
  // that request finished without producing an embedded session: submitting
  // went true → false, Reserve was explicitly pressed, and no clientSecret
  // arrived. Keep the traveller here and turn the same CTA into a retry.
  React.useEffect(() => {
    if (submitting) {
      wasSubmittingRef.current = true;
      setCheckoutError(false);
      return;
    }
    if (!wasSubmittingRef.current) return;
    wasSubmittingRef.current = false;
    if (reserveAttempted && !clientSecret) setCheckoutError(true);
  }, [submitting, reserveAttempted, clientSecret]);

  React.useEffect(() => {
    if (clientSecret) setCheckoutError(false);
  }, [clientSecret]);

  const handleReserve = React.useCallback(() => {
    setReserveAttempted(true);
    setCheckoutError(false);
    onReserve();
  }, [onReserve]);

  const tour = state.tourId ? findTour(state.tourId) : null;
  const title = state.journeyTitle ?? tour?.title ?? "Your Signature";
  const dateLabel = formatDate(guestDetails.tourDate ?? state.dateExact);
  const guestsLabel =
    formatGuestComposition(
      adults,
      minorAges,
      typeof guestDetails.guests === "number" ? guestDetails.guests : null,
    ) ?? "—";

  // Same priority chain as FinalRevealStory — labels only, no stories.
  const stopLabels: string[] = (() => {
    if (state.editedRoutePoints && state.editedRoutePoints.length > 0) {
      return state.editedRoutePoints.map((p) => p.label);
    }
    if (composedStops && composedStops.length > 0) {
      return composedStops.map((p) => p.label);
    }
    return (tour?.stops ?? []).map((s) => s.label);
  })();

  return (
    <section
      data-testid={testId ?? "studio-v3-checkout-summary"}
      aria-labelledby="studio-v3-checkout-summary-title"
      className={cn(
        // Bottom padding clears the fixed reserve bar (measured 122px at
        // 393px) with a ≥12px margin, so the Total row is never partly
        // covered at the end of the scroll.
        "w-full max-w-[560px] mx-auto px-5 pt-8 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.22em] min-h-[44px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        <ArrowLeft size={14} aria-hidden /> Back
      </button>

      <header className="mt-2 text-center">
        <Eyebrow>Almost yours</Eyebrow>
        <h2
          id="studio-v3-checkout-summary-title"
          className="mt-3 text-[22px] leading-[1.25] [text-wrap:balance]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "var(--charcoal)",
            fontWeight: 500,
          }}
        >
          {CHECKOUT_HEADER}
        </h2>
        <p
          className="mt-2 text-[13.5px] italic"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          }}
        >
          {title}
        </p>
      </header>

      {/* Summary card — Date · Guests · Stops · Add-ons · Total */}
      <div
        data-testid="studio-v3-checkout-summary-ledger"
        className="mt-9 px-1 py-6 space-y-5"
        style={{
          borderTop: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
          borderBottom: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
          background: "transparent",
          boxShadow: "none",
        }}
      >
        <Row
          label="Date"
          value={dateLabel ?? "Flexible"}
          onEdit={onEditGuestDetails}
          editLabel="Edit date"
          testId="studio-v3-checkout-summary-edit-date"
        />
        <Row
          label="Guests"
          value={guestsLabel}
          onEdit={onEditGuestDetails}
          editLabel="Edit party details"
          testId="studio-v3-checkout-summary-edit-guests"
        />

        {stopLabels.length > 0 ? (
          <div
            className="pt-4 border-t"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2.5"
              style={{ color: "var(--charcoal-soft)" }}
            >
              Stops
            </p>
            <ul
              className="space-y-1.5 text-[13.5px] leading-[1.45]"
              style={{ color: "var(--charcoal)" }}
              data-testid="studio-v3-checkout-summary-stops"
            >
              {stopLabels.map((label, i) => (
                <li key={`${i}-${label}`}>· {label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <PriceBreakdownRows
          journeyLines={journeyLines}
          label="Travellers"
          testId="studio-v3-checkout-summary-price-breakdown"
        />

        {selectedAddOns.length > 0 ? (
          <div
            className="pt-4 border-t"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2.5"
              style={{ color: "var(--charcoal-soft)" }}
            >
              Your additions
            </p>
            <ul
              className="space-y-1.5 text-[13.5px]"
              style={{ color: "var(--charcoal)" }}
              data-testid="studio-v3-add-on-lines"
            >
              {selectedAddOns.map((a) => {
                const guests =
                  typeof guestDetails.guests === "number" && guestDetails.guests > 0
                    ? guestDetails.guests
                    : 1;
                const isPerPerson = a.unit === "per_person";
                const showQty = isPerPerson && guests > 1;
                return (
                  <li
                    key={a.id}
                    data-testid="studio-v3-add-on-line"
                    data-addon-id={a.id}
                    data-per-unit-eur={a.perUnit}
                    data-amount-eur={a.amount}
                    data-unit={a.unit}
                    className="flex justify-between gap-3"
                  >
                    <span className="min-w-0">
                      · {a.label}
                      <span className="ml-1 tabular-nums" style={{ color: "var(--charcoal-soft)" }}>
                        {showQty ? `(${formatEur(a.perUnit)} × ${guests})` : `(${a.unitLabel})`}
                      </span>
                    </span>
                    <span
                      className="text-right tabular-nums font-medium"
                      style={{ color: "var(--charcoal)" }}
                    >
                      {formatEur(a.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div
          className="pt-4 border-t flex justify-between items-baseline"
          style={{ borderColor: "color-mix(in oklab, var(--gold) 55%, transparent)" }}
        >
          <span
            className="text-[11px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: "var(--charcoal)" }}
          >
            Your total
          </span>
          <span
            className="text-[27px] tabular-nums font-semibold"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            data-testid="studio-v3-checkout-summary-total"
          >
            {formatEur(totalEur)}
          </span>
        </div>
        <div
          className="flex justify-end text-[11px] uppercase tracking-[0.2em] text-right leading-[1.6]"
          style={{ color: "var(--charcoal-soft)" }}
        >
          <PerPersonBands
            journeyLines={journeyLines}
            adultUnitEur={perPaxEur}
            testId="studio-v3-checkout-summary-per-person"
          />
        </div>
      </div>

      {/* Guest identity recap — who is booking (not pricing) */}
      <div className="mt-7 flex items-center justify-between gap-5">
        <div
          className="min-w-0 text-[12.5px] leading-[1.55]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
        >
          <div className="font-medium" style={{ color: "var(--charcoal)" }}>
            {guestDetails.fullName}
          </div>
          <div className="break-all">{guestDetails.email}</div>
          <div>{guestDetails.phone}</div>
        </div>
        <button
          type="button"
          data-testid="studio-v3-checkout-summary-edit-guest-details"
          aria-label="Edit your details"
          onClick={onEditGuestDetails}
          className="shrink-0 text-[10.5px] uppercase tracking-[0.22em] min-h-[44px] px-3 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ color: "var(--teal)" }}
        >
          Edit
        </button>
      </div>

      <p
        className="mt-7 text-center text-[12.5px] leading-[1.55] italic"
        style={{
          fontFamily: "var(--font-editorial)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        {INSTANT_CONFIRMATION}
      </p>

      {/* Inline Stripe Embedded Checkout — same page as summary. */}
      {clientSecret && publishableKey ? (
        <div className="mt-14" data-testid="studio-v3-checkout-summary-stripe-inline">
          <div
            aria-hidden
            className="mx-auto h-px w-16"
            style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
          />
          <div
            className="mt-6 flex items-center justify-center gap-2 text-[10.5px] uppercase tracking-[0.24em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
          >
            <Lock size={11} aria-hidden strokeWidth={1.75} />
            <span>Secure payment · Powered by Stripe</span>
          </div>
          <div
            className="mt-5 px-4 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-8"
            style={{
              borderTop: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
              borderBottom: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--sand) 28%, var(--ivory)) 0%, var(--ivory) 100%)",
            }}
          >
            <EmbeddedCheckoutProvider
              stripe={getStripePromise(publishableKey)}
              // Stripe owns completion and redirects through the server-authored
              // return_url. That URL contains {CHECKOUT_SESSION_ID}, so the
              // confirmation route receives the real session id and can verify
              // payment instead of trusting a client-only success callback.
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      ) : (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur-sm px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          data-testid="studio-v3-checkout-summary-cta-bar"
        >
          <div className="max-w-[560px] mx-auto">
            {checkoutError ? (
              <p
                role="alert"
                data-testid="studio-v3-checkout-summary-error"
                className="mb-2 text-center text-[12px] leading-[1.45]"
                style={{ color: "var(--charcoal)" }}
              >
                Secure checkout couldn't open. Your details and total are still here.
              </p>
            ) : null}
            {submitting ? (
              <BookingCtaSkeleton className="w-full" label="Opening secure checkout…" />
            ) : (
              <CtaButton
                type="button"
                variant="primary"
                size="md"
                className="w-full"
                iconLeading={<Lock size={14} aria-hidden />}
                onClick={handleReserve}
                data-testid="studio-v3-checkout-summary-reserve"
              >
                {checkoutError ? "Try secure checkout again" : CTA_RESERVE_AND_PAY}
              </CtaButton>
            )}
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Secure checkout · Final price shown before payment
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  onEdit,
  editLabel,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  testId?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 text-[13.5px]"
      style={{ color: "var(--charcoal)" }}
    >
      <span
        className="text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "var(--charcoal-soft)" }}
      >
        {label}
      </span>
      <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
        <span className="min-w-0">{value}</span>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={editLabel ?? `Edit ${label.toLowerCase()}`}
            data-testid={testId}
            className="shrink-0 min-h-[44px] px-2 text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ color: "var(--teal)" }}
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default CheckoutSummary;