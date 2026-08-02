import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { Calendar, Sparkles, Lock, Loader2 } from "lucide-react";
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
import { CompositionField } from "@/components/booking/CompositionField";
import { PerPersonBands } from "@/components/checkout/PerPersonBands";
import {
  formatCompositionSummary,
  isCompositionComplete,
  totalGuests,
  type TravellerComposition,
} from "@/lib/checkout/composition";
import {
  getOperatingRule,
  computeMinDateISO,
  validateDateISO,
  type OperatingRule,
} from "@/lib/availability";

import { getStripeEnvironment } from "@/lib/stripe";
import { getViatorMeta } from "@/data/signatureToursViator";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { resolvePerPaxEur, resolveJourneyPricing } from "@/data/signatureTourPricing";
import { resolveClientIncludedItems } from "@/lib/checkout/inclusions";
import { getTourContent } from "@/lib/tourContent";
import {
  gaAddPaymentInfo,
  gaAddToCartSignature,
  gaBeginCheckout,
  buildTourItem,
  gaBookingDateSelected,
  gaBookingTimeSelected,
  gaBookingCompositionSet,
  gaBookingLanguageSelected,
  gaBookingValidationBlocked,
  gaCheckoutDrawerOpened,
} from "@/lib/analytics-ga4";

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
  const [composition, setComposition] = useState<TravellerComposition>({
    adults: 2,
    minorAges: [],
  });
  const guests = totalGuests(composition);
  const compositionReady = isCompositionComplete(composition);
  const [language, setLanguage] = useState<"en" | "pt">("en");
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Availability rule from public.tour_operating_rules (with safe defaults).
  const [rule, setRule] = useState<OperatingRule | null>(null);
  useEffect(() => {
    let active = true;
    getOperatingRule(tour.id).then((r) => {
      if (active) setRule(r);
    });
    return () => {
      active = false;
    };
  }, [tour.id]);
  const leadHours = rule?.minLeadHours ?? 24;
  const minDateISO = computeMinDateISO(leadHours);
  const dateValid = date
    ? validateDateISO(
        date,
        rule ?? {
          tourId: tour.id,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          blackoutDates: [],
          minLeadHours: leadHours,
          cutoffLocalTime: null,
        },
      ).ok
    : false;

  const canReserve = compositionReady && dateValid;

  // Fire funnel events at most once per field per mount.
  const firedDate = useRef(false);
  const firedTime = useRef(false);
  const firedComposition = useRef(false);
  const firedLanguage = useRef(false);
  const firedDrawer = useRef(false);

  useEffect(() => {
    if (compositionReady && !firedComposition.current) {
      firedComposition.current = true;
      gaBookingCompositionSet({
        tourId: tour.id,
        surface: "signature",
        adults: composition.adults,
        minors: composition.minorAges.length,
      });
    }
  }, [compositionReady, composition.adults, composition.minorAges.length, tour.id]);

  useEffect(() => {
    if (!firedLanguage.current) {
      firedLanguage.current = true;
      gaBookingLanguageSelected({ tourId: tour.id, surface: "signature", language });
    }
  }, [language, tour.id]);

  // Live tier resolution — DB-backed, falls back to code defaults.
  const { data: tierOverrides } = useTourPriceTiers();
  const perPax = resolvePerPaxEur(tour, guests, tierOverrides);
  const displayPerPaxEur = perPax?.eurPerPax ?? tour.priceFrom;
  const displayIsReal = perPax?.real === true;
  // Age-band aware party total — matches server pricing when minors present.
  const journeyPricing = resolveJourneyPricing(
    tour,
    composition.adults,
    composition.minorAges,
    tierOverrides,
  );
  const partyTotalEur =
    journeyPricing?.totalEur ?? perPax?.partyTotalEur ?? displayPerPaxEur * Math.max(1, guests);
  const hasMinors = composition.minorAges.length > 0;
  // Whether we have real per-pax tier data for this tour (code or DB override).
  const hasTierData = Boolean(
    (tierOverrides?.[tour.id] && Object.keys(tierOverrides[tour.id] as object).length > 0) ||
    getViatorMeta(tour.id)?.priceTiersEUR,
  );

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
    const resolved = resolvePerPaxEur(tour, details.guests, tierOverrides);
    const perPaxForSummary = resolved?.eurPerPax ?? tour.priceFrom;
    // Age-band aware total — mirrors the server pricing so the summary
    // and Stripe line items agree for families with minors.
    const summaryJourney = resolveJourneyPricing(
      tour,
      details.adults,
      details.minorAges,
      tierOverrides,
    );
    const totalForSummary =
      summaryJourney?.totalEur ?? Math.round(perPaxForSummary * details.guests);
    setCheckoutSummary({
      tourTitle: tour.title,
      region: tour.region,
      durationHours: tour.durationHours,
      guests: details.guests,
      adults: details.adults,
      minorAges: [...details.minorAges],
      dateExact: details.tourDate || null,
      startTime: details.startTime ?? null,
      pickupLabel: details.pickupAddress || pickup,
      pricePerPaxEur: perPaxForSummary,
      totalEur: totalForSummary,
      heroSrc: meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? tour.img,
      beats: (() => {
        const c = getTourContent(tour.id);
        if (c.included.length > 0) return c.included;
        if (c.highlights.length > 0) return c.highlights;
        return tour.highlights ?? [];
      })(),
      flowLabel: "Signature",
    });

    setDetailsOpen(false);
    setCheckoutOpen(true);
    if (!firedDrawer.current) {
      firedDrawer.current = true;
      gaCheckoutDrawerOpened({ tourId: tour.id, surface: "signature" });
    }
    // GA4 add_to_cart + begin_checkout — Signature Reserve intent.
    try {
      gaAddToCartSignature({ tour, guests: details.guests, perPaxEur: perPaxForSummary });
      const item = buildTourItem(tour, {
        quantity: details.guests,
        tier: "signature",
        itemCategory: "Signature",
      });
      item.price = perPaxForSummary;
      gaBeginCheckout({ items: [item], valueEur: Math.round(perPaxForSummary * details.guests) });
      trackEvent("checkout_started", {
        experience_id: tour.id,
        experience_type: "signature",
        group_size: details.guests,
        value: Math.round(perPaxForSummary * details.guests),
        currency: "EUR",
      });
    } catch {
      /* silent */
    }
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const stopLabels = (tour.stops ?? []).slice(0, 6).map((s) => s.label);
      const includedItems = resolveClientIncludedItems(meta, tour);
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          tourId: tour.id,
          tourTitle: tour.title,
          guests: details.guests,
          adults: details.adults,
          minorAges: details.minorAges,
          stopLabels,
          includedItems,
          pickupLabel: details.pickupAddress || pickup,
          dateExact: details.tourDate || null,
          journeyTitle: tour.title.split("—")[0].trim(),
          priceFromEur: tour.priceFrom,
          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          environment: getStripeEnvironment(),
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
      // GA4 add_payment_info — payment surface ready.
      try {
        const item = buildTourItem(tour, {
          quantity: details.guests,
          tier: "signature",
          itemCategory: "Signature",
        });
        item.price = perPaxForSummary;
        gaAddPaymentInfo({
          paymentType: "stripe",
          items: [item],
          valueEur: Math.round(perPaxForSummary * details.guests),
        });
      } catch {
        /* silent */
      }
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
            onChange={(e) => {
              const v = e.target.value;
              if (v && rule) {
                const check = validateDateISO(v, rule);
                if (!check.ok) {
                  gaBookingValidationBlocked({
                    tourId: tour.id,
                    surface: "signature",
                    reason: `date_${check.reason}`,
                  });
                  const msg =
                    check.reason === "weekday_closed"
                      ? "This tour doesn't run on that day. Please pick another date."
                      : check.reason === "blackout"
                        ? "That date is unavailable. Please pick another."
                        : "Please choose a date at least 24 hours from now.";
                  toast.error(msg);
                  return;
                }
              }
              setDate(v);
              if (v) {
                if (!firedDate.current) {
                  firedDate.current = true;
                  gaBookingDateSelected({ tourId: tour.id, surface: "signature", dateISO: v });
                }
              }
            }}
            min={minDateISO}
            className="w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 text-sm focus:border-[color:var(--gold)] focus:outline-none"
          />
        </Field>
        <Field label="Pickup time">
          <div className="grid grid-cols-3 border border-[color:var(--border)]">
            {(["08:00", "09:00", "10:00"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setPickup(t);
                  if (!firedTime.current) {
                    firedTime.current = true;
                    gaBookingTimeSelected({ tourId: tour.id, surface: "signature", pickupTime: t });
                  }
                }}
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

      {/* Who's travelling */}
      <div className="mt-4">
        <Field label="Who's travelling">
          <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-3">
            <CompositionField value={composition} onChange={setComposition} compact />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
            {compositionReady
              ? formatCompositionSummary(composition)
              : "Add an age for every child so we can price honestly."}
          </p>
        </Field>
      </div>

      {/* Language */}
      <div className="mt-3">
        <Field label="Guide language">
          <div className="grid grid-cols-2 border border-[color:var(--border)]">
            {(["en", "pt"] as const).map((l) => (
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
          <p className="mt-1.5 text-[10.5px] leading-snug text-[color:var(--charcoal-soft)]">
            Spanish available on request — subject to guide availability.
          </p>
        </Field>
      </div>

      {/* Price for chosen party — tier-resolved when we have real data. */}
      <div className="mt-6 border-t border-[color:var(--border)] pt-4 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            {displayIsReal
              ? `For ${guests} guest${guests > 1 ? "s" : ""} · per person`
              : hasTierData
                ? "From · 8+ guests · per person"
                : "From · per person"}
          </span>
          <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">
            €{Math.round(displayPerPaxEur).toLocaleString("en-GB")}
          </span>
        </div>
        {displayIsReal && hasMinors && journeyPricing?.lines?.length ? (
          <PerPersonBands
            journeyLines={journeyPricing.lines}
            className="block pt-1"
            rowClassName="flex items-baseline justify-between text-[12px] tracking-wide text-[color:var(--charcoal)]"
          />
        ) : null}
        {displayIsReal && guests > 1 ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
              Party total (indicative)
            </span>
            <span className="serif text-[1.05rem] text-[color:var(--charcoal)]">
              €{Math.round(partyTotalEur).toLocaleString("en-GB")}
              {!hasMinors ? (
                <span className="ml-1.5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans not-italic">
                  €{Math.round(displayPerPaxEur)} × {guests}
                </span>
              ) : (
                <span className="ml-1.5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans not-italic">
                  age-based pricing
                </span>
              )}
            </span>
          </div>
        ) : null}
        {!displayIsReal && hasTierData ? (
          <p className="pt-1 text-[10.5px] leading-snug text-[color:var(--charcoal-soft)]">
            Smaller parties are priced per tier — pick your guests to see the exact per-person rate.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!canReserve) {
            const reason = !dateValid ? "date_missing_or_past" : "composition_incomplete";
            gaBookingValidationBlocked({ tourId: tour.id, surface: "signature", reason });
            toast.error(
              !dateValid ? "Pick a date at least 24h from now." : "Add an age for every child.",
            );
            return;
          }
          setDetailsOpen(true);
        }}
        disabled={pending}
        aria-disabled={!canReserve}
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
        <Lock size={10} /> Secure checkout
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
        priceQuote={({ adults, minorAges }) => {
          // Same resolver + arguments as handleReserve → Stripe.
          const j = resolveJourneyPricing(tour, adults, minorAges, tierOverrides);
          if (!j) return null;
          return {
            totalEur: j.totalEur,
            perPaxAdultEur: j.perPaxAdultEur,
            hasMinors: minorAges.length > 0,
            adults,
            minors: minorAges.length,
            journeySubtotalEur: j.totalEur,
            addOnsEur: 0,
          };
        }}
        open={detailsOpen}
        onOpenChange={(o) => {
          setDetailsOpen(o);
          if (o && !firedDrawer.current) {
            firedDrawer.current = true;
            trackEvent("availability_open", {
              experience_id: tour.id,
              experience_type: "signature",
            });
          }
          if (o && tour.id) {
            // Eager-prewarm Stripe on intent so the drawer opens instantly.
            // We don't yet know the PK, but loadStripe is cached so the first
            // real call after confirm hits the same in-flight promise.
          }
        }}
        submitting={pending}
        tourId={tour.id}
        initial={{
          tourDate: date,
          adults: composition.adults,
          minorAges: [...composition.minorAges],
          language,
        }}
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
            adults: composition.adults,
            minorAges: [...composition.minorAges],
            pricePerPaxEur: displayPerPaxEur,
            totalEur: Math.round(partyTotalEur),
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
