import { BandedSignatureBookingForm } from "@/components/booking/BandedSignatureBookingForm";
import type { SignatureTour } from "@/data/signatureTours";

/**
 * SimpleBookingForm — public Signature reserve path.
 * Internal pricing only — no external category/readiness dependency.
 */
export function SimpleBookingForm({ tour }: { tour: SignatureTour }) {
  return <BandedSignatureBookingForm tour={tour} />;
}
