import { useState } from "react";
import { Calendar, Users, Sparkles, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { SignatureTour } from "@/data/signatureTours";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FinalDetailsDialog, type GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import {
  BrandedCheckoutDrawer,
  type CheckoutSummary,
} from "@/components/checkout/BrandedCheckoutDrawer";

import { getViatorMeta } from "@/data/signatureToursViator";

/**
 * SimpleBookingForm — the *reserve as-is* path.
 *
 * Embedded Stripe checkout in a branded drawer. The server resolves the
 * per-pax price from `tour_price_tiers`; the client never sets it. Tailoring
 * lives on a separate page (`/tours/$tourId/tailor`).
 */
export function SimpleBookingForm({ tour }: { tour: SignatureTour }) {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [pickup, setPickup] = useState<"08:00" | "09:00" | "10:00">("09:00");
  const [guests, setGuests] = useState(2);
  const [language, setLanguage] = useState<"en" | "pt" | "es" | "fr">("en");
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Embedded checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);

  const handleReserve = async (details: GuestDetails) => {
    if (pending) return;
    setPending(true);
    // Open the drawer immediately so the user sees a branded skeleton
    // while the edge function is in flight (saves the "blank" feeling).
    const meta = getViatorMeta(tour.id);
    setCheckoutSummary({
      tourTitle: tour.title,
      region: tour.region,
      durationHours: tour.durationHours,
      guests: details.guests,
      dateExact: details.tourDate || null,
      startTime: details.startTime ?? null,
      pickupLabel: details.pickupAddress || pickup,
      pricePerPaxEur: tour.priceFrom,
      heroSrc: meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? tour.img,
      beats: (tour.highlights ?? []).slice(0, 4),
      flowLabel: "Signature",
    });
    setDetailsOpen(false);
    setCheckoutOpen(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const stopLabels = (tour.stops ?? []).slice(0, 6).map((s) => s.label);
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          tourId: tour.id,
          tourTitle: tour.title,
          guests: details.guests,
          stopLabels,
          pickupLabel: details.pickupAddress || pickup,
          dateExact: details.tourDate || null,
          journeyTitle: tour.title.split("—")[0].trim(),
          priceFromEur: tour.priceFrom,
          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          environment: "sandbox",
          tailored: false,
          flow: "signature",
          uiMode: "embedded",
          guestDetails: { ...details, hotelPickupIncluded: true },
        },
      });
      if (error) throw error;
      const resp = (data ?? {}) as {
        clientSecret?: string;
        publishableKey?: string;
      };
      if (!resp.clientSecret || !resp.publishableKey) {
        throw new Error("Embedded checkout unavailable");
      }
      setClientSecret(resp.clientSecret);
      setPublishableKey(resp.publishableKey);
    } catch (e) {
      console.error("Signature checkout failed", e);
      toast.error("Checkout unavailable right now. Please try again in a moment.");
      setCheckoutOpen(false);
    } finally {
      setPending(false);
    }
  };


  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-7">
      <Eyebrow>Reserve this day</Eyebrow>
      <SectionTitle size="compact" spacing="tight">
        Book the Signature, <SectionTitle.Em>as designed</SectionTitle.Em>
      </SectionTitle>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        The full Signature — route, story and local guide intact. Pick a day, confirm instantly.
      </p>

      {/* Date + pickup */}
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

      {/* Guests + language */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Guests" icon={<Users size={14} />}>
          <div className="flex items-center border border-[color:var(--border)]">
            <button
              type="button"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              className="px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
              aria-label="Decrease guests"
            >
              −
            </button>
            <span className="flex-1 text-center text-sm">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(12, g + 1))}
              className="px-3 py-2.5 text-sm hover:bg-[color:var(--sand)]"
              aria-label="Increase guests"
            >
              +
            </button>
          </div>
        </Field>
        <Field label="Guide language">
          <div className="grid grid-cols-4 border border-[color:var(--border)]">
            {(["en", "pt", "es", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                aria-pressed={language === l}
                className={[
                  "py-2.5 text-xs uppercase tracking-[0.18em] transition-colors",
                  language === l
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Price anchor */}
      <div className="mt-6 flex items-baseline justify-between border-t border-[color:var(--border)] pt-4">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          From
        </span>
        <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
          €{tour.priceFrom}
          <span className="ml-1 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            / pp
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 disabled:cursor-not-allowed text-[color:var(--ivory)] px-5 py-3.5 text-sm tracking-wide transition-all min-h-[52px]"
      >
        {pending ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Opening checkout…
          </>
        ) : (
          <>
            <Sparkles size={15} /> Reserve this day
          </>
        )}
      </button>
      <p className="mt-2 text-[11px] text-[color:var(--charcoal-soft)] text-center">
        Instant confirmation · Final price shown before payment
      </p>
      <p className="mt-1 inline-flex w-full items-center justify-center gap-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80">
        <Lock size={10} /> Stripe · Apple Pay · Google Pay
      </p>

      <div className="mt-5 pt-4 border-t border-[color:var(--border)] text-center">
        <p className="text-[12px] text-[color:var(--charcoal-soft)]">
          Want to adjust a few details?
        </p>
        <Link
          to="/tours/$tourId/tailor"
          params={{ tourId: tour.id }}
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--gold)]"
        >
          Tailor this Signature
        </Link>
      </div>

      <FinalDetailsDialog
        open={detailsOpen}
        onOpenChange={(o) => {
          setDetailsOpen(o);
          if (o && tour.id) {
            // Eager-prewarm Stripe on intent so the drawer opens instantly.
            // We don't yet know the PK, but loadStripe is cached so the first
            // real call after confirm hits the same in-flight promise.
          }
        }}
        submitting={pending}
        tourId={tour.id}
        initial={{ tourDate: date, guests, language, pickupAddress: pickup }}
        onConfirm={async (details) => {
          await handleReserve(details);
        }}
      />

      <BrandedCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={(o) => {
          setCheckoutOpen(o);
          if (!o) {
            setClientSecret(null);
          }
        }}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        summary={
          checkoutSummary ?? {
            tourTitle: tour.title,
            guests,
            pricePerPaxEur: tour.priceFrom,
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
    <div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)] mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
