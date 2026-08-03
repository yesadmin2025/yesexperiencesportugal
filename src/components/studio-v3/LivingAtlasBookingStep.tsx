import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import { CheckoutSummary } from "@/components/studio-v3/CheckoutSummary";
import { GuestDetailsStep } from "@/components/studio-v3/GuestDetailsStep";
import { buildLivingAtlasCheckoutHandoff } from "@/components/studio-v3/livingAtlasCheckoutHandoff";
import type { LivingAtlasPreviewPreferences } from "@/components/studio-v3/livingAtlasPreviewComposition";
import type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";
import type {
  ExperienceProfile,
  LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { findTour } from "@/data/signatureTours";
import { getViatorMeta } from "@/data/signatureToursViator";
import { resolveJourneyPricing } from "@/data/signatureTourPricing";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { supabase } from "@/integrations/supabase/client";
import { getTourContent } from "@/lib/tourContent";

export function LivingAtlasBookingStep({
  signatureId,
  selectedDate,
  profile,
  preferences,
  routePlan,
  onBack,
}: {
  signatureId: LivingAtlasSignatureId;
  selectedDate: string;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  routePlan: LivingAtlasRoutePlan;
  onBack: () => void;
}) {
  const tour = findTour(signatureId);
  const { data: tourPriceTiers } = useTourPriceTiers();
  const handoff = useMemo(
    () =>
      buildLivingAtlasCheckoutHandoff({
        signatureId,
        selectedDate,
        profile,
        preferences,
        routePlan,
      }),
    [preferences, profile, routePlan, selectedDate, signatureId],
  );
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  const pricing = useMemo(() => {
    if (!tour || !guestDetails) return null;
    return resolveJourneyPricing(
      tour,
      guestDetails.adults,
      guestDetails.minorAges,
      tourPriceTiers,
    );
  }, [guestDetails, tour, tourPriceTiers]);

  if (!tour) {
    return (
      <section className="mx-auto max-w-xl text-center">
        <p className="text-sm">This Studio direction is not ready for checkout.</p>
        <button type="button" onClick={onBack} className="mt-5 underline underline-offset-4">
          Return to the day
        </button>
      </section>
    );
  }

  const summaryState = guestDetails
    ? {
        ...handoff.studioState,
        adults: guestDetails.adults,
        minorAges: [...guestDetails.minorAges],
        guests: guestDetails.guests,
      }
    : handoff.studioState;

  const openStripeCheckout = async () => {
    if (!guestDetails || checkoutPending) return;
    const resolvedPricing = resolveJourneyPricing(
      tour,
      guestDetails.adults,
      guestDetails.minorAges,
      tourPriceTiers,
    );
    if (!resolvedPricing) {
      toast.error("This party composition cannot be priced yet.");
      return;
    }

    setCheckoutPending(true);
    try {
      const content = getTourContent(tour.id);
      const viator = getViatorMeta(tour.id);
      const includedItems =
        content.included.length > 0
          ? content.included
          : viator?.included && viator.included.length > 0
            ? viator.included
            : (tour.included ?? []);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
        body: {
          tourId: tour.id,
          tourTitle: tour.title ?? tour.id,
          guests: guestDetails.guests,
          adults: guestDetails.adults,
          minorAges: guestDetails.minorAges,
          stopLabels: handoff.stopLabels,
          itinerary: handoff.itinerary.map((moment) => ({
            label: moment.label,
            durationMinutes: moment.durationMinutes,
            note: moment.note ?? undefined,
          })),
          includedItems,
          pickupLabel: guestDetails.pickupAddress,
          dateExact: selectedDate,
          journeyTitle: handoff.journeyTitle,
          customerEmail: guestDetails.email,
          priceFromEur: tour.priceFrom ?? 180,
          returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
          environment: "sandbox",
          flow: "studio",
          uiMode: "embedded",
          durationLabel: `${Math.round((handoff.durationMinutes / 60) * 10) / 10} hours of selected moments`,
          guestDetails,
          addOns: [],
        },
      });

      if (error) throw error;
      const response = (data ?? {}) as { clientSecret?: string; publishableKey?: string };
      if (!response.clientSecret || !response.publishableKey) {
        throw new Error("Stripe sandbox checkout is unavailable");
      }
      setClientSecret(response.clientSecret);
      setPublishableKey(response.publishableKey);
    } catch (error) {
      console.error("[LivingAtlasBookingStep] checkout failed", error);
      toast.error("Secure checkout is unavailable right now. Please try again.");
      setClientSecret(null);
      setPublishableKey(null);
    } finally {
      setCheckoutPending(false);
    }
  };

  if (!guestDetails) {
    return (
      <div>
        <p
          className="mx-auto mb-4 max-w-xl text-center text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "var(--gold)" }}
        >
          Isolated preview · Stripe sandbox
        </p>
        <GuestDetailsStep
          tourId={tour.id}
          journeyTitle={handoff.journeyTitle}
          fixedTourDate={selectedDate}
          submitLabel="Continue to secure checkout"
          initial={{ tourDate: selectedDate, adults: 2, minorAges: [] }}
          priceQuote={({ adults, minorAges }) => {
            const quote = resolveJourneyPricing(tour, adults, minorAges, tourPriceTiers);
            if (!quote) return null;
            return {
              totalEur: Math.round(quote.totalEur),
              perPaxAdultEur: quote.perPaxAdultEur,
              hasMinors: minorAges.length > 0,
              adults,
              minors: minorAges.length,
              journeySubtotalEur: Math.round(quote.totalEur),
              addOnsEur: 0,
            };
          }}
          onBack={onBack}
          onSubmit={(details) => setGuestDetails(details)}
        />
      </div>
    );
  }

  return (
    <div>
      <p
        className="mx-auto mb-4 max-w-xl text-center text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: "var(--gold)" }}
      >
        Isolated preview · Stripe sandbox
      </p>
      <CheckoutSummary
        state={summaryState}
        guestDetails={guestDetails}
        selectedAddOns={[]}
        adults={guestDetails.adults}
        minorAges={guestDetails.minorAges}
        composedStops={handoff.itinerary}
        perPaxEur={pricing?.perPaxAdultEur ?? null}
        totalEur={pricing?.totalEur ?? null}
        submitting={checkoutPending}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        onBack={() => {
          setClientSecret(null);
          setPublishableKey(null);
          setGuestDetails(null);
        }}
        onEditGuestDetails={() => {
          setClientSecret(null);
          setPublishableKey(null);
          setGuestDetails(null);
        }}
        onReserve={() => void openStripeCheckout()}
        onPaymentComplete={(sessionId) => {
          const params = new URLSearchParams({ tour: tour.id });
          if (sessionId) params.set("session_id", sessionId);
          window.location.assign(`/booking-confirmed?${params.toString()}`);
        }}
      />
    </div>
  );
}
