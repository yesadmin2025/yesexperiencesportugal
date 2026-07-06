## Goal

Today `selectedAddOnIds` lives inside `SignaturePriceCard`. When the user hits Say YES, the drawer summary and Stripe session both fall back to the base tour price and stops — the add-ons the user just picked silently vanish. Lift that state one level up so every downstream surface stays in sync.

## 1. Make `SignaturePriceCard` a controlled surface for add-ons

- Add optional `selectedAddOnIds?: string[]` and `onAddOnsChange?: (ids: string[], summary: { totalEur: number; totalMinutes: number; items: Array<{ id: string; label: string; priceEur: number; durationMinutes: number }> }) => void` props.
- Keep the current `useState` as a fallback for legacy/test callers; when controlled, read from props and forward toggles through `onAddOnsChange`.
- Emit the summary in a `useEffect` whenever `selectedAddOnIds`, `priceEur`, or the derived `availableAddOns` change, so the parent always has fresh totals + labels.
- No visual changes — the chips, budget gauge, and drawer spine keep rendering exactly as they do now.

## 2. Own the state in `StudioV3` (reveal harness)

- Add `const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])` and `const [selectedAddOns, setSelectedAddOns] = useState<AddOnSummary[]>([])` in the reveal component that renders `<SignaturePriceCard>`.
- Reset both when the resolved tour id changes (new reveal ⇒ clean slate).
- Wire the new props into the price card.

## 3. Thicken the drawer summary (`BrandedCheckoutDrawer`)

- Extend `CheckoutSummary` with `addOns?: Array<{ id: string; label: string; priceEur: number; durationMinutes: number }>` and `addOnsTotalEur?: number`.
- When building `checkoutSummary` in `handleStripeCheckout`, pass the lifted add-ons and add their euro total to `pricePerPaxEur` accounting (kept per-pax at the base tier; add-ons stay flat per booking to mirror current card math).
- Render, under the tour title, a compact block:
  - "Your day" strip: `{durationHours + addOnsTotalHours}h · {guests} guests · {dateExact}`.
  - `• {name} — €{price}` list for each selected add-on (Inter 12px, charcoal 70%).
  - Total line unchanged in structure, but now equals `basePerPax × guests + addOnsTotalEur`.

## 4. Send add-ons to Stripe (`create-signature-checkout` edge function)

- Accept an optional `addOns: Array<{ id: string; label: string; priceEur: number; durationMinutes: number }>` in the request body (Zod-validate: id ≤ 64 chars, label ≤ 120, priceEur ≥ 0 ≤ 1000, durationMinutes ≥ 0 ≤ 480, max 6 items).
- Re-validate each add-on server-side against the tour's canonical add-on catalogue (same resolver the card uses) — never trust the client for price. If an id is unknown, drop it silently and log.
- Append one Stripe `line_items` entry per validated add-on (`quantity: 1`, `unit_amount: priceEur * 100`, `product_data.name: label`).
- Include a canonical `addOns` array in the session `metadata` (id + priceEur) so the webhook and booking row can persist it.

## 5. Persist on the booking

- Extend the `bookings` insert in the webhook handler (`stripe-webhook` / booking confirmation path) to write `add_ons jsonb` (nullable). Migration adds the column with `DEFAULT '[]'::jsonb`, plus the standard grants + RLS unchanged.

## 6. Tests + verification

- Extend `add-ons-gating-total.test.tsx` with a controlled-mode case: parent owns ids, chip click fires `onAddOnsChange` with the expected summary shape.
- New unit test: `handleStripeCheckout` invocation payload includes the selected add-ons.
- Vitest for the edge function's Zod validator (accept valid, reject over-cap, drop unknown ids).
- `tsgo --noEmit` + `bunx vitest run` gated suites green.
- Playwright on 393×852: select 2 add-ons on reveal → Say YES → confirm drawer shows both line items and the total matches `base × guests + add-ons`. Screenshot the drawer.

## Out of scope

- No changes to the reveal spacing, gauge caption, or date caption (already shipped).
- No pricing formula changes — add-ons still cost `pricePctOfBase × baseEur`, flat per booking.
- No new AI copy.

## Technical notes

- `AddOnSummary` type lives next to `SignaturePriceCard` and is re-exported for the harness.
- `resolvePerPaxEur` stays the source of truth for the base tier; add-ons are added after the per-pax multiplication (mirrors the card's `partyTotalWithAddOnsEur` shape).
- Edge function validation reuses the same `addOnEurFromBase` helper the client uses, imported from a shared `@/lib/studio-v3/addons` module so client and server can't drift.
