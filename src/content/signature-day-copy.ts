/**
 * signature-day-copy.ts
 *
 * Single source of truth for user-facing copy on the Signature Day reveal.
 * Introduced in Step 6 of the post-builder journey plan.
 *
 * Non-negotiable rules (see plan §G):
 *   - Never use "Everything included" or "All entrances included" on the
 *     Studio reveal path. Use INCLUSION_HEADER + INCLUSION_FOOTNOTE.
 *   - Add-on line items always display their pricing unit ("per guest",
 *     "per group", "per vehicle", or flat) — enforced by SignaturePriceCard
 *     via addOnEurFor(). Copy here is the label side of that contract.
 *   - No invented superlatives, no comparisons to competitors, no invented
 *     stops or partners. All strings here describe operational truth only.
 *
 * All strings are const so they can be imported by tests to assert copy
 * drift and by SEO checks without duplicating literals.
 */

export const INCLUSION_HEADER = "Included in your selected itinerary" as const;

export const INCLUSION_FOOTNOTE =
  "Optional additions are priced separately and shown before checkout." as const;

export const APPROVAL_LABELS = {
  approved: "YES Approved",
  review: "Route being reviewed",
  reject: "Preliminary itinerary",
  incomplete: "Preliminary itinerary",
} as const;

export const CTA_PRIMARY = "Continue with my Signature Day" as const;
export const CTA_REBALANCE = "Rebalance this day" as const;
export const CTA_REFINE = "Adjust the moments" as const;
export const CTA_READ_FULL_STORY = "Read the full story" as const;
export const CTA_SHOW_DRIVING = "Show driving details" as const;
export const CTA_HIDE_DRIVING = "Hide driving details" as const;
export const CTA_SEE_MORE_ADDONS = "See more options" as const;
export const CTA_SEE_INCLUSIONS = "See what's included" as const;

// Composer → Refine handoff (MapAwakens primary CTA).
export const CTA_PERSONALISE = "Personalise a few details" as const;

// Refine screen (SignaturePriceCard) — secondary "quiet help" CTA.
export const CTA_ASK_CURATOR = "Ask a curator for help" as const;

// Refine screen — shorter, less formal inclusions header (reveal keeps INCLUSION_HEADER).
export const INCLUDED_HEADER_REFINE = "Included in your day" as const;

// Final Reveal — cinematic story screen after refinement.
export const REVEAL_TITLE = "Your story in Portugal" as const;
// Primary CTA on Storytelling — advances to Guest Details / checkout.
// Uses transactional language so the user feels the reservation is one
// tap away, not another "next step".
export const CTA_CONTINUE_TO_GUEST_DETAILS = "Continue to guest details" as const;
/**
 * @deprecated Retired P1 (audit fix #5). The same string used to appear
 * on both Refine and Storytelling — Refine now says "See my signature
 * story", Storytelling keeps `CTA_CONTINUE_TO_GUEST_DETAILS`. Kept only
 * as a value-identical alias so external imports don't break; delete
 * once no consumers remain.
 */
export const CTA_MAKE_STORY = CTA_CONTINUE_TO_GUEST_DETAILS;
export const CTA_SAVE_SIGNATURE = "Save my signature" as const;
export const CTA_BACK_TO_REFINE = "Back to refine" as const;

// Checkout Summary — last screen before payment.
export const CHECKOUT_HEADER = "Ready to reserve" as const;
export const CTA_RESERVE_AND_PAY = "Reserve and pay" as const;
/** Final booking seam CTA — the day the traveller shaped, not a generic cart. */
export const CTA_RESERVE_YOUR_DAY = "Reserve your day" as const;
export const INSTANT_CONFIRMATION =
  "Instant confirmation. Your date is held the moment you reserve." as const;

export const REASSURANCE_DEFAULT: ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly detail: string;
}> = [
  {
    key: "private-guide",
    label: "Private guide",
    detail: "A licensed local host, only for your party.",
  },
  {
    key: "private-transport",
    label: "Private transport",
    detail: "Door-to-door, no shared vans.",
  },
  {
    key: "real-operator",
    label: "Real local operator",
    detail: "Every stop is run by the people we already work with.",
  },
  {
    key: "flexible",
    label: "Flexible on the day",
    detail: "Small changes are welcome — just tell your guide.",
  },
];
