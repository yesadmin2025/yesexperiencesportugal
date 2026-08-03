import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTourContent } from "@/lib/tourContent";
import { getViatorMeta } from "@/data/signatureToursViator";
import { resolveJourneyPricing } from "@/lib/studio-v3/composerPricing";
import { getStripeEnvironment } from "@/lib/stripeEnvironment";
import type { SignatureTour } from "@/data/signatureTours";
import type { TierPrice } from "@/data/signatureTourPricing";
import type { StudioCheckoutHandoff } from "@/components/studio-v3/livingAtlasCheckout";
import type { GuestDetails } from "@/components/checkout/FinalDetailsDialog";

interface LivingAtlasBookingStepProps {
  tour: SignatureTour;
  handoff: StudioCheckoutHandoff;
  tourPriceTiers: TierPrice[];
  guestDetails: GuestDetails | null;
  onBack: () => void;
}

export function LivingAtlasBookingStep({
  tour,
  handoff,
  tourPriceTiers,
  guestDetails,
  onBack,
}: LivingAtlasBookingStepProps) {
  const [checkoutPending, setCheckoutPending] = useState(false);

  const pricing = useMemo(() => {
    if (!guestDetails) return null;
    return resolveJourneyPricing(
      tour,
      guestDetails.adults,
      guestDetails.minorAges,
      tourPriceTiers,
    );
  }, [guestDetails, tour, tourPriceTiers]);

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
            : [];
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
          included: includedItems,
          addOns: handoff.addOns,
          travelDate: guestDetails.travelDate,
          guestDetails,
          guideNotes: guestDetails.guideNotes,
          expectedPrice: resolvedPricing.total,
          expectedCurrency: "EUR",
          successUrl: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/studio-v3`,
          stripeEnvironment: getStripeEnvironment(),
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Checkout URL missing");
      window.location.assign(data.url);
    } catch (error) {
      console.error("[living-atlas-booking] checkout failed", error);
      toast.error("Checkout could not be opened. Please try again.");
      setCheckoutPending(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-10" aria-label="Booking summary">
      <button type="button" onClick={onBack} className="text-sm underline underline-offset-4">
        Back
      </button>
      <h2 className="mt-6 font-display text-3xl">Complete your booking</h2>
      <p className="mt-3 text-sm opacity-75">
        Review your private day and continue to secure checkout when ready.
      </p>

      <div className="mt-8 rounded-lg border p-5">
        <p className="font-medium">{tour.title}</p>
        <p className="mt-2 text-sm opacity-75">
          {guestDetails?.guests ?? 0} guest{guestDetails?.guests === 1 ? "" : "s"}
        </p>
        {pricing ? (
          <p className="mt-4 text-lg font-semibold">€{pricing.total.toFixed(2)}</p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={!guestDetails || checkoutPending || !pricing}
        onClick={openStripeCheckout}
        className="mt-6 w-full rounded-md bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checkoutPending ? "Opening secure checkout…" : "Continue to secure checkout"}
      </button>
    </section>
  );
}
