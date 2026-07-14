// BandedSignatureBookingForm — Signature reserve form driven by the pure
// internal pricing pipeline (tour_price_tiers → resolveInternalQuote).
// No external availability or reservation. Stripe is called via
// create-signature-checkout, which server-recomputes the total from the
// same inputs.

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Sparkles, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { SignatureTour } from "@/data/signatureTours";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { GuestCompositionPicker } from "@/components/booking/GuestCompositionPicker";
import { LivePriceBreakdown } from "@/components/booking/LivePriceBreakdown";
import { useInternalQuote } from "@/hooks/use-internal-quote";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
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
import { parseCheckoutError } from "@/lib/checkout/checkoutError";

type Props = { tour: SignatureTour };

export function BandedSignatureBookingForm({ tour }: Props) {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [composition, setComposition] = useState<TravellerComposition>({
    ...EMPTY_COMPOSITION,
    adults: 2,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const { quote } = useInternalQuote({ tour, composition, enabled: true });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);

  const totalGuests = totalParticipants(composition);
  const canReserve = useMemo(
    () => !!date && totalGuests > 0 && !!quote && quote.finalTotalEur > 0 && quote.billableGuests > 0,
    [date, totalGuests, quote],
  );

  async function handleReserve(details: GuestDetails) {
    if (pending || !quote) return;
    setPending(true);
    const meta = getViatorMeta(tour.id);
    setCheckoutSummary({
      tourTitle: tour.title,
      region: tour.region,
      durationHours: tour.durationHours,
      guests: totalGuests,
      dateExact: details.tourDate || date,
      startTime: details.startTime ?? pickup,
      pickupLabel: details.pickupAddress || pickup,
      priceLines: quote.lines,
      addOnLines: quote.addOnLines,
      totalEur: quote.finalTotalEur,
      heroSrc: meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? tour.img,
      beats: meta?.included?.length ? meta.included : (tour.highlights ?? []),
      flowLabel: "Signature",
    });
    setDetailsOpen(false);
    setCheckoutOpen(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          tourId: tour.id,
          tourTitle: tour.title,
          priceFromEur: tour.priceFrom,
          date: details.tourDate || date,
          startTime: details.startTime ?? pickup,
          composition,
          environment: getStripeEnvironment(),
          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          uiMode: "embedded",
          customerEmail: details.email,
          pickupLabel: details.pickupAddress || pickup,
          region: tour.region,
        },
      });
      if (error) throw error;
      const resp = data as { clientSecret?: string; publishableKey?: string } | null;
      if (!resp?.clientSecret || !resp?.publishableKey) {
        throw new Error("Embedded checkout unavailable");
      }
      setClientSecret(resp.clientSecret);
      setPublishableKey(resp.publishableKey);
    } catch (e) {
      const parsed = await parseCheckoutError(e);
      toast.error(parsed.userMessage);
      setCheckoutOpen(false);
    } finally {
      setPending(false);
    }
  }

  // Hide site-wide WhatsApp FAB while Reserve CTA is on-screen.
  const reserveCtaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = reserveCtaRef.current;
    if (!el || typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const setHidden = (hidden: boolean) => {
      window.dispatchEvent(new CustomEvent("whatsapp-support:set-hidden", { detail: { hidden } }));
    };
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) setHidden(entry.isIntersecting);
    }, { threshold: 0.01 });
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
        Instant confirmation — final price locked at reservation.
      </p>

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
        <GuestCompositionPicker value={composition} onChange={setComposition} />
      </div>

      <div data-testid="booking-summary" className="mt-6 border-t border-[color:var(--border)] pt-4">
        {!date ? (
          <p className="text-[11px] text-[color:var(--charcoal-soft)]">
            Choose a date to see live pricing.
          </p>
        ) : quote ? (
          <LivePriceBreakdown quote={quote} />
        ) : (
          <p className="text-[11px] text-[color:var(--charcoal-soft)]">
            Add at least one adult, youth or child to see the total.
          </p>
        )}
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
        <Lock size={10} /> Secure checkout · instant confirmation by email
      </p>

      <div className="mt-5 pt-4 border-t border-[color:var(--border)] text-center">
        <p className="text-[12px] text-[color:var(--charcoal-soft)]">
          Want to adjust a few details?
        </p>
        <Link
          to="/contact"
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
        >
          Talk to a designer
        </Link>
      </div>

      <FinalDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        submitting={pending}
        tourId={tour.id}
        lockGuestCount
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
            priceLines: quote?.lines,
            addOnLines: quote?.addOnLines,
            totalEur: quote?.finalTotalEur ?? 0,
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
