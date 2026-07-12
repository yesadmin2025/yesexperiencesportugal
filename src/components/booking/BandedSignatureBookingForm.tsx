// BandedSignatureBookingForm
//
// Phase C replacement for SimpleBookingForm on tours where
// `banded_pricing_enabled = true` in `tour_price_tiers`. Live pricing is
// served by the `bokun-quote` edge function; checkout goes through
// `create-signature-checkout` in `bokun-signature-create-session` mode,
// which re-verifies the signed quoteToken server-side before Stripe.
//
// Nothing in this component computes a price locally — the only source of
// truth is the quote response.

import { useMemo, useState } from "react";
import { Calendar, Sparkles, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { SignatureTour } from "@/data/signatureTours";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { supabase } from "@/integrations/supabase/client";
import { GuestCompositionPicker } from "@/components/booking/GuestCompositionPicker";
import { useBokunQuote } from "@/hooks/use-bokun-quote";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import { getStripeEnvironment } from "@/lib/stripe";
import { getViatorMeta } from "@/data/signatureToursViator";
import { resolveClientIncludedItems } from "@/lib/checkout/inclusions";
import {
  FinalDetailsDialog,
  type GuestDetails,
} from "@/components/checkout/FinalDetailsDialog";
import {
  BrandedCheckoutDrawer,
  type CheckoutSummary,
} from "@/components/checkout/BrandedCheckoutDrawer";
import type { GuestMix } from "@/lib/pricing/ageBandPricing";
import { BokunRolloutBadge } from "@/components/booking/BokunRolloutBadge";


type Props = {
  tour: SignatureTour;
  readiness: TourBokunReadiness;
};

export function BandedSignatureBookingForm({ tour, readiness }: Props) {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [guestMix, setGuestMix] = useState<GuestMix>({
    adults: 2,
    youths: 0,
    children: 0,
    infants: 0,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const quote = useBokunQuote({
    internalProductKey: tour.id,
    date: date || null,
    startTime: pickup,
    guestMix,
    enabled: true,
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);

  const totalGuests =
    guestMix.adults + guestMix.youths + guestMix.children + guestMix.infants;

  const canReserve = useMemo(
    () =>
      !!date &&
      totalGuests > 0 &&
      !!quote.data?.ok &&
      !!quote.data?.quoteToken &&
      quote.data.finalTotalEur > 0,
    [date, totalGuests, quote.data],
  );

  async function handleReserve(details: GuestDetails) {
    if (pending) return;
    if (!quote.data?.quoteToken) {
      toast.error("Live quote unavailable — please refresh and try again.");
      return;
    }
    setPending(true);
    const meta = getViatorMeta(tour.id);
    const finalTotal = quote.data.finalTotalEur;
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
    });
    setDetailsOpen(false);
    setCheckoutOpen(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const includedItems = resolveClientIncludedItems(meta, tour);
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          mode: "bokun-signature-create-session",
          quoteToken: quote.data.quoteToken,
          currentRevision: "r0",
          environment: getStripeEnvironment(),
          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          uiMode: "embedded",
          tourTitle: tour.title,
          pickupLabel: details.pickupAddress || pickup,
          journeyTitle: tour.title.split("—")[0].trim(),
          tailored: false,
          includedItems,
          guestDetails: { ...details, hotelPickupIncluded: true },
        },
      });
      if (error) throw error;
      const resp = (data ?? {}) as { clientSecret?: string; publishableKey?: string };
      if (!resp.clientSecret || !resp.publishableKey) {
        throw new Error("Embedded checkout unavailable");
      }
      setClientSecret(resp.clientSecret);
      setPublishableKey(resp.publishableKey);
    } catch (e) {
      console.error("Bókun-authoritative checkout failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        msg.includes("quote_stale")
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
  const quoteError = !quote.loading && !quote.data?.ok && (quote.error || quote.data?.reason);

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
            className="w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-sm focus:border-[color:var(--gold)] focus:outline-none"
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
        <GuestCompositionPicker
          categories={readiness.bokunCategories}
          guestMix={guestMix}
          onChange={setGuestMix}
        />
      </div>

      {/* Live price panel — driven ONLY by the quote response */}
      <div className="mt-6 border-t border-[color:var(--border)] pt-4">
        {!date ? (
          <p className="text-[11px] text-[color:var(--charcoal-soft)]">
            Choose a date to see live availability and pricing.
          </p>
        ) : quotePending ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-[color:var(--charcoal-soft)]">
            <Loader2 size={12} className="animate-spin" /> Fetching live quote…
          </p>
        ) : quoteError ? (
          <p className="inline-flex items-center gap-2 text-[11px] text-amber-800">
            <AlertTriangle size={12} /> {quote.data?.reason ?? quote.error ?? "Unavailable"}
          </p>
        ) : quote.data?.ok ? (
          <div className="space-y-2">
            <ul className="space-y-1 text-[12px]">
              {quote.data.lines.map((l) => (
                <li key={l.bokunCategoryId} className="flex items-baseline justify-between gap-3">
                  <span className="text-[color:var(--charcoal-soft)] capitalize">
                    {l.uiBand} · {l.label} × {l.quantity}
                  </span>
                  <span className="tabular-nums">
                    €{l.subtotalEur.toLocaleString("en-GB")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between pt-2 border-t border-[color:var(--border)]">
              <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                Total
              </span>
              <span className="serif text-[1.4rem]">
                €{Math.round(quote.data.finalTotalEur).toLocaleString("en-GB")}
              </span>
            </div>
            {quote.data.warnings.length ? (
              <ul className="text-[10.5px] text-amber-800 list-disc list-inside">
                {quote.data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        disabled={pending || !canReserve}
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
            pricePerPaxEur: quote.data?.finalTotalEur
              ? Math.round(quote.data.finalTotalEur / Math.max(1, totalGuests))
              : tour.priceFrom,
            totalEur: Math.round(quote.data?.finalTotalEur ?? 0),
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
