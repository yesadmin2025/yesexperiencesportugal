/** Canonical public conversion language for the YES purchase paths. */
export const CTA_LABELS = {
  studio: "Design your day",
  /** Context-specific Studio invitation used when the Studio label already
   *  appeared higher on the same page (avoids CTA repetition). */
  studioSection: "Open the Studio",
  signatureDiscovery: "Explore Signature Experiences",
  /** Compact collection entry used inside homepage discovery bands. */
  signatureCollection: "Explore the collection",
  signatureDiscoveryCompact: "Explore Signature days",
  signatureBooking: "Reserve this day",
  tailor: "Tailor this day",
  refine: "Refine this day",
  travelDesigner: "Design my journey",
  moments: "Plan a special moment",
  corporate: "Plan a private group experience",
  studioReveal: "Love this day · Reserve it",
} as const;

export const RETIRED_PUBLIC_CTA_LABELS = [
  "Create your day",
  "Build your experience",
  "Begin designing",
  "Start your journey",
] as const;