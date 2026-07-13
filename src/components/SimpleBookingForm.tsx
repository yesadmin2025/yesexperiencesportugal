import { useTourBokunReadinessFor } from "@/hooks/use-tour-bokun-readiness";
import { BandedSignatureBookingForm } from "@/components/booking/BandedSignatureBookingForm";
import type { SignatureTour } from "@/data/signatureTours";

/**
 * SimpleBookingForm — public Signature reserve path.
 *
 * The category-aware BandedSignatureBookingForm is the only supported public
 * booking surface. An empty client readiness mirror means "not synced yet",
 * NOT "adults-only product" — the `booking-quote` edge function auto-syncs
 * Bókun categories server-side on first call. Never fall back to a legacy
 * adults-only stepper because the mirror hasn't warmed up.
 */
export function SimpleBookingForm({ tour }: { tour: SignatureTour }) {
  const { readiness } = useTourBokunReadinessFor(tour.id);
  return <BandedSignatureBookingForm tour={tour} readiness={readiness ?? null} />;
}
