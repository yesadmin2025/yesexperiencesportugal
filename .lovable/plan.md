## Goal

Before a guest enters their details and moves to payment, show one unambiguous line — **"You'll be charged €X"** — using exactly the same amount that is sent to Stripe, in all three booking paths: Signature, Tailored Signature, and Studio.

## Current state (verified)

- All three flows collect details in the same place before Stripe: `FinalDetailsDialog` (Signature via `SimpleBookingForm`, Tailor via `tours.$tourId.tailor.tsx`) and `GuestDetailsStep` (Studio V3, an inline variant of the same form).
- Each flow already computes the Stripe-bound total *after* the dialog is confirmed, inside its own `handleReserve`, via `resolveJourneyPricing(...)`:
  - Signature: tour tiers + live tier overrides.
  - Tailor: tiers pinned to the adjusted per-pax (`tailorTierOverride`), so stop removals/add-ons are reflected.
  - Studio: `perPaxBase` + `addOnsPartyTotalEur`.
- The dialog itself shows no charge amount — only "Secure checkout · Final price shown before payment". So the guest fills in the form blind, and the number first appears on the Stripe surface.

## Approach

Introduce one shared, live price quote into the details step, driven by the composition the guest is editing (adults + each child's age), so the number updates as they change the party.

### 1. Shared quote contract

Add an optional prop to `FinalDetailsDialog`:

```
priceQuote?: (c: { adults: number; minorAges: number[] }) =>
  { totalEur: number; perPaxAdultEur: number; hasMinors: boolean } | null
```

Returning `null` means "not priceable yet" (incomplete child ages, manual-confirmation path) — the band then shows a neutral "Final price confirmed before payment" state instead of a number.

### 2. Shared presentation component

New `src/components/checkout/ChargeSummaryLine.tsx`:
- Ivory/sand band directly above the confirm CTA.
- Primary line: **You'll be charged €X** (total, EUR, no cents), in Fraunces at the size of a section figure.
- Secondary line (Inter, small, muted): `X adults · €Y per adult` and, when minors are present, `child pricing applied (youth 75% · child 50% · infants free)`.
- Third micro-line: "Charged securely in EUR. No hidden fees."
- Reduced-motion-safe number crossfade when the total changes; no animation beyond a 180ms fade.

### 3. Wire each flow to its Stripe math

Each route passes a `priceQuote` that calls the *same* resolver with the *same* arguments its `handleReserve` already uses — no duplicated formulas:

- **Signature** (`SimpleBookingForm`): `resolveJourneyPricing(tour, adults, minorAges, tierOverrides)`.
- **Tailor** (`tours.$tourId.tailor.tsx`): `resolveJourneyPricing({ id, priceFrom: estimatedPrice }, adults, minorAges, tailorTierOverride)`, so removed stops / add-on deltas are inside the quoted number. When the selection requires manual confirmation (wine extension / manual supplier), return `null` so we never quote a price we can't charge.
- **Studio V3** (`GuestDetailsStep`, fed from `StudioV3`): same resolver with `perPaxBase`, plus `addOnsPartyTotalEur` added to the total — mirroring `handleReserve` exactly.

To keep them honest, extract the per-flow math into small pure helpers used by both the quote and the reserve handler, so the two can't drift.

### 4. Studio inline step

`GuestDetailsStep` gets the same `priceQuote` prop and renders the same `ChargeSummaryLine` above its footer CTA, respecting the existing mobile sticky footer layout.

### 5. Guardrail test

Extend the existing checkout tests with a parity test: for a set of party compositions (2 adults; 2 adults + 1 child age 7; 2 adults + infant; 6 adults) in each flow, the amount rendered by `ChargeSummaryLine` equals the `totalEur` the flow sends to `create-signature-checkout`.

## Technical notes

- No backend or pricing-logic changes; the server remains the authority and its math is untouched.
- Mobile-first: the band sits above the CTA, never inside a scroll trap, and stays visible with the sticky footer on 393px viewports.
- Currency: EUR is the charged currency; if the site-wide USD switcher is active the USD figure may be shown as a parenthetical "approx." only, with EUR as the charged amount.
