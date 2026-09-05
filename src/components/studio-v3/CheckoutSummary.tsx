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
import { buildWineryDisplayLabels, studioDisplayLabel } from "./studioWineryPresentation";
import { formatGuestComposition } from "./formatGuests";
import {
  CHECKOUT_HEADER,
  CTA_RESERVE_YOUR_DAY,
  INSTANT_CONFIRMATION,
} from "@/content/signature-day-copy";
import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";
import type { GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics-events";
import { CANCELLATION } from "@/config/business-nap";
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
  /**
   * Date and party are committed in the preflight, so their edits route back
   * there — never to the contact form that no longer owns them.
   */
  readonly onEditOperational?: () => void;
  /**
   * Localized route/stops edit. Optional: when the host has no existing
   * storyboard return path, the affordance is simply not rendered — we never
   * fabricate navigation here.
   */
  readonly onEditStops?: () => void;
  readonly onBack: () => void;
  readonly onReserve: () => void;
  readonly clientSecret?: string | null;
  readonly publishableKey?: string | null;
  /** Exact final-validation reason; the reviewed summary remains mounted. */
  readonly checkoutBlock?: string | null;
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
  onEditOperational,
  onEditStops,
  onBack,
  onReserve,
  clientSecret = null,
  publishableKey = null,
  checkoutBlock = null,
  className,
  testId,
}: CheckoutSummaryProps) {
  // Last mile: the summary always opens at its own top. Arriving mid-scroll
  // from guest details hides the price line and reads as a broken step.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Funnel seam: checkout summary viewed. Fires once per mount — the ref
  // guard keeps StrictMode/rerenders from double-counting.
  const viewTrackedRef = React.useRef(false);
  React.useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackEvent("studio_checkout_summary_view", {
      experience_type: "studio",
      experience_id: state.tourId ?? null,
      placement: "studio_checkout_summary",
    });
  }, [state.tourId]);

  const [reserveAttempted, setReserveAttempted] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState(false);
  const wasSubmittingRef = React.useRef(false);
  const stripeSurfaceRef = React.useRef<HTMLDivElement | null>(null);

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

  const paymentTrackedRef = React.useRef(false);
  React.useEffect(() => {
    if (!clientSecret) return;
    setCheckoutError(false);
    if (!paymentTrackedRef.current) {
      paymentTrackedRef.current = true;
      trackEvent("studio_payment_surface_ready", {
        experience_type: "studio",
        experience_id: state.tourId ?? null,
        placement: "studio_checkout_summary",
      });
    }
    // Embedded Checkout is intentionally below the reviewed summary. Bring
    // the newly mounted secure form into view so Reserve always feels like a
    // completed transition, especially on a 393px phone viewport.
    window.requestAnimationFrame(() => {
      stripeSurfaceRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  }, [clientSecret, state.tourId]);

  const handleReserve = React.useCallback(() => {
    setReserveAttempted(true);
    setCheckoutError(false);
    trackEvent("studio_reserve_click", {
      experience_type: "studio",
      experience_id: state.tourId ?? null,
      placement: "studio_checkout_summary",
      value: typeof totalEur === "number" ? totalEur : undefined,
      currency: "EUR",
    });
    onReserve();
  }, [onReserve, state.tourId, totalEur]);

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
  // Canonical labels are resolved first (order/count are authoritative), then
  // passed through the centralized winery presentation guard for DISPLAY only.
  const stopLabels: string[] = (() => {
    const canonical = (() => {
      if (state.editedRoutePoints && state.editedRoutePoints.length > 0) {
        return state.editedRoutePoints.map((p) => p.label);
      }
      if (composedStops && composedStops.length > 0) {
        return composedStops.map((p) => p.label);
      }
      return (tour?.stops ?? []).map((s) => s.label);
    })();
    const displayLabels = buildWineryDisplayLabels(canonical.map((label) => ({ label })));
    return canonical.map((label) => studioDisplayLabel(label, displayLabels));
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
        className="mt-8 px-1 py-5 space-y-4"
        style={{
          borderTop: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
          borderBottom: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
          background: "transparent",
          boxShadow: "none",
        }}
      >
        {/* Localized edits: each recap area routes back through the step that
            already owns it, so a wrong date never traps the traveller here.
            No new phase or state machinery — existing callbacks only. */}
        <Row
          label="Date"
          value={dateLabel ?? "Flexible"}
          onEdit={onEditOperational ?? onEditGuestDetails}
          editLabel="Edit your date"
          editTestId="studio-v3-checkout-summary-edit-date"
        />
        <Row
          label="Guests"
          value={guestsLabel}
          onEdit={onEditOperational ?? onEditGuestDetails}
          editLabel="Edit your party"
          editTestId="studio-v3-checkout-summary-edit-guests"
        />

        {stopLabels.length > 0 ? (
          <div
            className="pt-3 border-t"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p
                className="text-[11.5px] uppercase tracking-[0.2em]"
                style={{ color: "var(--charcoal-soft)" }}
              >
                Stops
              </p>
              {onEditStops ? (
                <RecapEdit
                  onClick={onEditStops}
                  label="Edit your stops"
                  testId="studio-v3-checkout-summary-edit-stops"
                />
              ) : null}
            </div>
            <ul
              className="space-y-1 text-[14.5px] leading-[1.55]"
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
            className="pt-3 border-t"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
          >
            <p
              className="text-[11.5px] uppercase tracking-[0.2em] mb-2"
              style={{ color: "var(--charcoal-soft)" }}
            >
              Your additions
            </p>
            <ul
              className="space-y-1 text-[14.5px] leading-[1.55]"
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
          className="pt-3 border-t flex justify-between items-baseline"
          style={{ borderColor: "color-mix(in oklab, var(--gold) 55%, transparent)" }}
        >
          <span
            className="text-[12px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: "var(--charcoal)" }}
          >
            Your total
          </span>
          <span
            className="text-[26px] tabular-nums font-semibold"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            data-testid="studio-v3-checkout-summary-total"
          >
            {formatEur(totalEur)}
          </span>
        </div>
        <div
          className="flex justify-end text-[12px] uppercase tracking-[0.2em] text-right leading-[1.6]"
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
      <div className="mt-6 flex items-center justify-between">
        <div
          className="text-[13.5px] leading-[1.5]"
          style={{ color: "var(--charcoal-soft)" }}
        >
          <div className="font-medium" style={{ color: "var(--charcoal)" }}>
            {guestDetails.fullName}
          </div>
          <div>{guestDetails.email}</div>
          <div>{guestDetails.phone}</div>
        </div>
        <button
          type="button"
          data-testid="studio-v3-checkout-summary-edit-guest-details"
          aria-label="Edit your details"
          onClick={onEditGuestDetails}
          className="text-[12px] uppercase tracking-[0.2em] min-h-[44px] px-3"
          style={{ color: "var(--teal)" }}
        >
          Edit
        </button>
      </div>

      <p
        className="mt-6 text-center text-[13.5px] italic"
        style={{
          fontFamily: "var(--font-editorial)",
          color: "var(--charcoal-soft)",
        }}
      >
        {INSTANT_CONFIRMATION}
      </p>

      {/* Inline Stripe Embedded Checkout — same page as summary. */}
      {clientSecret && publishableKey ? (
        <div
          ref={stripeSurfaceRef}
          className="mt-14 scroll-mt-5"
          data-testid="studio-v3-checkout-summary-stripe-inline"
        >
          {/* While the card fields are on screen the ledger has scrolled away.
              A quiet sticky line keeps the amount being charged visible, so
              nobody types a card without the total in view. */}
          <div
            data-testid="studio-v3-checkout-sticky-total"
            className="sticky top-0 z-30 -mx-5 mb-2 flex items-baseline justify-between gap-3 px-5 py-2 backdrop-blur-sm sm:mx-0 sm:rounded-sm sm:px-4"
            style={{
              background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
              borderBottom: "1px solid color-mix(in oklab, var(--gold) 35%, transparent)",
            }}
          >
            <span
              className="text-[12.5px] uppercase tracking-[0.2em]"
              style={{ color: "var(--charcoal)" }}
            >
              Paying now
            </span>
            <span
              className="text-[16px] tabular-nums font-semibold"
              style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            >
              {formatEur(totalEur)}
            </span>
          </div>

          <div
            aria-hidden
            className="mx-auto h-px w-16"
            style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
          />
          <div
            className="mt-6 flex items-center justify-center gap-2 text-[12.5px] uppercase tracking-[0.2em]"
            style={{ color: "var(--charcoal-soft)" }}
            data-testid="studio-v3-checkout-security-note"
          >
            <Lock size={13} aria-hidden strokeWidth={1.75} />
            <span>Secure payment · Powered by Stripe</span>
          </div>
          <CancellationNote className="mt-3" />
          <div
            // Full-bleed on phones: the section's own 20px padding plus an
            // inner inset squeezed Stripe's payment form to ~281px on a
            // 393px screen. Pull it back out so the card fields get the
            // whole width.
            className="mt-5 -mx-5 px-2 pt-5 pb-6 sm:mx-0 sm:px-6 sm:pt-6 sm:pb-8"
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
            {checkoutError || checkoutBlock ? (
              <p
                role="alert"
                data-testid="studio-v3-checkout-summary-error"
                className="mb-2 text-center text-[12px] leading-[1.45]"
                style={{ color: "var(--charcoal)" }}
              >
                {checkoutBlock ?? "Secure checkout couldn't open. Your details and total are still here."}
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
                {checkoutError || checkoutBlock ? "Try secure checkout again" : CTA_RESERVE_YOUR_DAY}
              </CtaButton>
            )}
            <p className="mt-2 text-center text-[12.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              Secure checkout · Final price shown before payment
            </p>
            <CancellationNote className="mt-1.5" />
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Cancellation/terms disclosure shown at the payment seam.
 *
 * Copy comes from the canonical `CANCELLATION` source of truth — never a
 * hard-coded number — and links to the full terms page for the exact rules.
 */
function CancellationNote({ className }: { className?: string }) {
  return (
    <p
      data-testid="studio-v3-checkout-cancellation-note"
      className={cn("text-center text-[12.5px] leading-[1.5]", className)}
      style={{ color: "var(--charcoal-soft)" }}
    >
      {CANCELLATION.custom.en}{" "}
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
        style={{ color: "var(--teal)" }}
      >
        Booking &amp; cancellation terms
      </a>
    </p>
  );
}

/** Quiet, 44px-tall text affordance. Secondary by weight, never a second CTA. */
function RecapEdit({
  onClick,
  label,
  testId,
}: {
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      className="-mr-2 inline-flex items-center min-h-[44px] px-2 text-[11.5px] uppercase tracking-[0.2em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{ color: "var(--teal)" }}
    >
      Edit
    </button>
  );
}

function Row({
  label,
  value,
  onEdit,
  editLabel,
  editTestId,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  editTestId?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 text-[14.5px]"
      style={{ color: "var(--charcoal)" }}
    >
      <span
        className="text-[12px] uppercase tracking-[0.2em]"
        style={{ color: "var(--charcoal-soft)" }}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-right">
        <span>{value}</span>
        {onEdit && editLabel && editTestId ? (
          <RecapEdit onClick={onEdit} label={editLabel} testId={editTestId} />
        ) : null}
      </span>
    </div>
  );
}

export default CheckoutSummary;
