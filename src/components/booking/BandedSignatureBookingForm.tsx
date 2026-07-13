// BandedSignatureBookingForm
//
// Launch-spec v3 Signature booking form. Uses the provider-neutral
// `useBookingQuote` hook (→ `booking-quote` edge function) for live pricing,
// and `createBookingQuoteSession` (→ `create-signature-checkout` in
// `mode: "booking-quote-create-session"`) for checkout. Server is the sole
// price authority — nothing in this component computes a price locally.

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Sparkles, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { SignatureTour } from "@/data/signatureTours";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TravellerCompositionPicker } from "@/components/booking/TravellerCompositionPicker";
import { useBookingQuote } from "@/hooks/use-booking-quote";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import { getStripeEnvironment } from "@/lib/stripe";
import { getViatorMeta } from "@/data/signatureToursViator";
import {
  FinalDetailsDialog,
  type GuestDetails,
} from "@/components/checkout/FinalDetailsDialog";
import {
  BrandedCheckoutDrawer,
  type CheckoutSummary,
} from "@/components/checkout/BrandedCheckoutDrawer";
import {
  EMPTY_COMPOSITION,
  totalParticipants,
  type TravellerComposition,
} from "@/lib/pricing/travellerComposition";
import { createBookingQuoteSession } from "@/lib/pricing/bookingQuoteCheckout";
import { BokunRolloutBadge } from "@/components/booking/BokunRolloutBadge";

type Props = {
  tour: SignatureTour;
  /**
   * Client-side readiness mirror. `null` = "not synced yet" (first visit,
   * or a tour whose `tour_price_tiers` row is still empty). The banded form
   * MUST still call `booking-quote`; the server performs the category
   * synchronisation and returns the authoritative categories in-response.
   * Used here only for the informational rollout badge — never as a gate
   * on the quote request or on rendering the composition picker.
   */
  readiness: TourBokunReadiness | null;
};

export function BandedSignatureBookingForm({ tour, readiness }: Props) {

  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [composition, setComposition] = useState<TravellerComposition>({
    ...EMPTY_COMPOSITION,
    adults: 2,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const quote = useBookingQuote({
    flow: "signature",
    commercialProductKey: tour.id,
    date: date || null,
    startTime: pickup,
    composition,
    enabled: true,
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);

  const totalGuests = totalParticipants(composition);
  const available = !!quote.quote;
  const canReserve = useMemo(
    () =>
      !!date &&
      totalGuests > 0 &&
      available &&
      !!quote.quote?.quoteToken &&
      (quote.quote?.finalTotalEur ?? 0) > 0,
    [date, totalGuests, available, quote.quote],
  );

  const resolvedMinors = useMemo(() => {
    if (!quote.quote) return undefined;
    const minorLines = quote.quote.basePricing.lines.filter(
      (l) => Array.isArray(l.ages) && l.ages.length > 0,
    );
    return composition.minorAges.map((age) => {
      const line = minorLines.find((l) => (l.ages ?? []).includes(age));
      return line ? { age, bandLabel: line.label } : null;
    });
  }, [quote.quote, composition.minorAges]);

  async function handleReserve(details: GuestDetails) {
    if (pending) return;
    const q = quote.quote;
    if (!q?.quoteToken) {
      toast.error("Live quote unavailable — please refresh and try again.");
      return;
    }
    setPending(true);
    const meta = getViatorMeta(tour.id);
    const finalTotal = q.finalTotalEur;
    const perPax = Math.round(finalTotal / Math.max(1, totalGuests));
    setCheckoutSummary({
      tourTitle: tour.title,
      region: tour.region,
      durationHours: tour.durationHours,
      guests: totalGuests,
      dateExact: details.tourDate || date,
      startTime: details.startTime ?? pickup,
      pickupLabel: details.pickupAddress || pickup,
      pricePerPaxEur: perPax,
      totalEur: Math.round(finalTotal),
      heroSrc: meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? tour.img,
      beats: meta?.included?.length ? meta.included : (tour.highlights ?? []),
      flowLabel: "Signature",
      bokunReadiness: readiness,
    });
    setDetailsOpen(false);
    setCheckoutOpen(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const resp = await createBookingQuoteSession({
        quoteToken: q.quoteToken,
        environment: getStripeEnvironment(),
        returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
        uiMode: "embedded",
        tourTitle: tour.title,
        pickupLabel: details.pickupAddress || pickup,
        journeyTitle: tour.title.split("—")[0].trim(),
        customerEmail: details.email,
      });
      if (!resp.clientSecret || !resp.publishableKey) {
        throw new Error("Embedded checkout unavailable");
      }
      setClientSecret(resp.clientSecret);
      setPublishableKey(resp.publishableKey);
    } catch (e) {
      console.error("v3 signature checkout failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      const stale =
        msg.includes("quote_stale") ||
        msg.includes("quote_expired") ||
        msg.includes("slot_capacity_lost") ||
        msg.includes("slot_no_longer_offered");
      toast.error(
        stale
          ? "Availability changed — please review your selection and try again."
          : "Checkout unavailable right now. Please try again in a moment.",
      );
      setCheckoutOpen(false);
      quote.refresh();
    } finally {
      setPending(false);
    }
  }

  const quotePending = quote.loading;
  const unavailableMsg = quote.unavailable?.message ?? quote.error;

  // Hide the site-wide WhatsApp FAB while the Reserve CTA is on screen so
  // the floating button never overlaps the primary action. Uses the existing
  // `whatsapp-support:set-hidden` event contract. ALWAYS re-shows on cleanup
  // (element leaves viewport, component unmounts, observer disconnected) so
  // the button never stays hidden after navigating away.
  const reserveCtaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = reserveCtaRef.current;
    if (!el || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const setHidden = (hidden: boolean) => {
      window.dispatchEvent(
        new CustomEvent("whatsapp-support:set-hidden", { detail: { hidden } }),
      );
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setHidden(entry.isIntersecting);
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setHidden(false);
    };
  }, []);


  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7">
      <Eyebrow>Reserve this day</Eyebrow>
      <SectionTitle size="compact" spacing="tight">
        Book the Signature, <SectionTitle.Em>as designed</SectionTitle.Em>
      </SectionTitle>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Live availability and pricing — categories and rates confirmed against Bókun in real time.
      </p>
      <div className="mt-3">
        <BokunRolloutBadge readiness={readiness} tourId={tour.id} />
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date" icon={<Calendar size={14} />}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            aria-label="Tour date"
            data-testid="booking-date-input"
            className="w-full min-h-[44px] border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-sm focus:border-[color:var(--gold)] focus:outline-none"
          />
          {!date ? (
            <p className="mt-1 text-[11px] text-[color:var(--charcoal-soft)]">
              Tap to pick a date
            </p>
          ) : null}
        </Field>

        <Field label="Pickup time">
          <div className="grid grid-cols-3 border border-[color:var(--border)]">
            {(["08:00", "09:00", "10:00"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPickup(t)}
                aria-pressed={pickup === t}
                className={[
                  "py-2.5 text-xs tracking-wide transition-colors",
                  pickup === t
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <TravellerCompositionPicker
          value={composition}
          onChange={setComposition}
          resolvedMinors={resolvedMinors}
          unresolvedAges={quote.unavailable?.unresolvedAges}
        />
      </div>

      {/* Live price panel — driven ONLY by the quote response */}
      <div
        data-testid="booking-summary"
        className="mt-6 border-t border-[color:var(--border)] pt-4"
      >

        {!date ? (
          <p className="text-[11px] text-[color:var(--charcoal-soft)]">
            Choose a date to see live availability and pricing.
          </p>
        ) : quotePending ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-[color:var(--charcoal-soft)]">
            <Loader2 size={12} className="animate-spin" /> Fetching live quote…
          </p>
        ) : quote.unavailable || quote.error ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-amber-800">
            <AlertTriangle size={12} /> {unavailableMsg ?? "Unavailable"}
          </p>
        ) : quote.quote ? (
          <div className="space-y-2">
            <ul className="space-y-1 text-[12px]">
              {quote.quote.basePricing.lines.map((l) => (
                <li key={l.bokunCategoryId} className="flex items-baseline justify-between gap-3">
                  <span className="text-[color:var(--charcoal-soft)] capitalize">
                    {l.label} × {l.quantity}
                    {l.isFree ? " · included" : ""}
                  </span>
                  <span className="tabular-nums">
                    €{l.subtotalEur.toLocaleString("en-GB")}
                  </span>
                </li>
              ))}
              {quote.quote.addOnPricing.lines.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-[color:var(--charcoal-soft)]">
                    {a.label} × {a.quantity}
                  </span>
                  <span className="tabular-nums">
                    €{a.subtotalEur.toLocaleString("en-GB")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between pt-2 border-t border-[color:var(--border)]">
              <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                Total
              </span>
              <span className="serif text-[1.4rem]">
                €{Math.round(quote.quote.finalTotalEur).toLocaleString("en-GB")}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={reserveCtaRef} className="pb-24 sm:pb-4">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          disabled={pending || !canReserve}
          data-testid="reserve-cta"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 disabled:cursor-not-allowed text-[color:var(--ivory)] px-5 py-3.5 text-sm tracking-wide transition-all min-h-[52px]"
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Opening checkout…
            </>
          ) : (
            <>
              <Sparkles size={15} /> Reserve securely
            </>
          )}
        </button>
        <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)] text-center">
          Instant confirmation
        </p>
      </div>

      <p className="mt-1 inline-flex w-full items-center justify-center gap-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80">
        <Lock size={10} /> Secure checkout · price re-verified with Bókun
      </p>

      <div className="mt-5 pt-4 border-t border-[color:var(--border)] text-center">
        <p className="text-[12px] text-[color:var(--charcoal-soft)]">
          Want to adjust a few details?
        </p>
        <Link
          to="/tours/$tourId/tailor"
          params={{ tourId: tour.id }}
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
        >
          Tailor this day
        </Link>
      </div>

      <FinalDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        submitting={pending}
        tourId={tour.id}
        initial={{
          tourDate: date,
          guests: totalGuests,
          language: "en",
          pickupAddress: pickup,
        }}
        onConfirm={async (details) => {
          await handleReserve(details);
        }}
      />

      <BrandedCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={(o) => {
          setCheckoutOpen(o);
          if (!o) setClientSecret(null);
        }}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        summary={
          checkoutSummary ?? {
            tourTitle: tour.title,
            guests: totalGuests,
            pricePerPaxEur: quote.quote?.finalTotalEur
              ? Math.round(quote.quote.finalTotalEur / Math.max(1, totalGuests))
              : 0,

            totalEur: Math.round(quote.quote?.finalTotalEur ?? 0),
            flowLabel: "Signature",
          }
        }
        onComplete={(sid) => {
          setCheckoutOpen(false);
          navigate({
            to: "/booking-confirmed",
            search: { session_id: sid ?? undefined, tour: tour.id },
          });
        }}
      />
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
