## What's in place today

- Studio V3 keeps `state` in memory only. It saves to the server on explicit "Save signature" and rehydrates via `?saved=<token>`, but nothing persists across a normal leave/return.
- `selectedAddOnIds` lives beside `state` and is force-cleared every time `state.tourId` changes (`StudioV3.tsx` L771–775). Even a within-session refine resets add-ons.
- Add-on chips already have a `disabled` visual state, but the only reason ever surfaced is "Won't fit this day (Nm)". No copy for "max reached", no notice when the tour is in bespoke/no-price mode, no notice when a tour has zero add-ons.
- Totals already recompute (`useMemo` + `resolvedServerPricing`), but the "Final estimated total" card only appears once add-ons are selected, so changing guests or stops alone gives no visible confirmation.

## Fix

### 1. Persist and restore the in-progress draft
New hook `src/components/studio-v3/useStudioV3AutoPersist.ts`:

- Storage key `yes.studio.v3.draft.v1`, SSR-safe.
- Persists `{ state, tourId, addOnIds, addOnItems, addOnsTotalEur, savedAt }` with a 300 ms debounce.
- Hydrate on mount only when:
  - `?saved=<token>` is NOT present (server hydrate wins), and
  - the persisted state has meaningful progress (phase past `intro` OR any of `feeling`/`rhythm`/`interests`/`companions` set).
- Add-ons restore only when the persisted `tourId` matches the current `state.tourId` — a fresh Signature naturally starts clean.
- Clear on: Stripe success return, explicit "Start over", and after a successful `saveStudioV3Signature`.
- Silent restore (no toast) to preserve the guided-not-asked tone; a small "— Draft restored" chip under `BackLink` is acceptable, mirroring the existing "Your Signature · draft" eyebrow style.

In `StudioV3.tsx`:
- Wire the hook right after `useState<StudioV3State>` + the add-on state.
- Replace the hard reset in the `useEffect` on `state.tourId` (L771–775) with a "reset only when tourId actually changes to a different, non-null tour" guard so hydration doesn't wipe restored add-ons on the same tour.

### 2. Clearer add-on availability messaging
In `src/components/studio-v3/SignaturePriceCard.tsx`, add-on list:

- Compute a `reason` string per chip:
  - `!fits` → "Needs {a.durationMinutes − remainingMinutes} min more than the day allows"
  - `atCap && !selected` → "Max {MAX_ADDONS} add-ons — deselect one to swap"
  - Both → time-fit message wins (more actionable).
- Render the reason where "Won't fit this day" currently sits, keeping the same 9.5 px uppercase micro-line, `data-testid="addon-availability-reason"`.
- Under the list, replace "Up to {MAX_ADDONS} add-ons" with:
  - When any disabled chip exists: "Locked options don't fit the day's rhythm or the {MAX_ADDONS}-item limit."
  - Otherwise: keep current copy.
- When `allowAddOnsWithoutPrice && !hasPrice`, render a one-line teal notice above the list: "Add-ons priced from the tour catalog · base investment confirmed by a curator."
- When the picker would render nothing because the tour truly has no add-ons (`showAddOns && (hasPrice || allowAddOnsWithoutPrice) && availableAddOns.length === 0`), render a quiet ivory notice "No add-ons for this Signature — the day already includes everything." instead of silently hiding.

### 3. Always-visible live breakdown + total
In `SignaturePriceCard.tsx`:

- Move the "Final estimated total" block out from under `selectedAddOnIds.length > 0` — show it whenever `partyTotalEur != null`. Retitle to "Live total" when nothing is added and "Final estimated total" when add-ons are selected.
- Add a two-line breakdown above the total, always visible when `hasPrice`:
  - Line 1: `Base €{displayPerPaxEur} × {partyCount} guests = €{baseParty}`
  - Line 2 (only when add-ons selected): `Additions €{addOnsPartyTotal}`
  - Wrapped in `aria-live="polite"` so changes are announced.
- When `resolvedServerPricing?.status === "loading"`, replace the numeric total with a subtle "Recalculating…" line for ~1 frame; keep the previous number visible with 0.6 opacity instead of blanking (avoids jitter as the server-signed quote refreshes on guests / stops / add-on toggles).
- No math changes — the existing `partyTotalEur` / `addOnsPartyTotalEur` values already recompute reactively.

## Guardrails

- No schema changes, no new server functions, no invented pricing.
- No configurator vibe: microcopy stays restrained, no modal, no toast spam.
- Mobile-first: reuses existing chip and total layout at 393 px; only microcopy and one always-on breakdown row are added.
- Studio philosophy: draft restore is silent and guided; live total is reassurance, not a dashboard; add-on reasons explain rather than nag.

## Files touched

- `src/components/studio-v3/useStudioV3AutoPersist.ts` (new)
- `src/components/studio-v3/StudioV3.tsx` (wire persistence, guard the tourId reset, clear on save/checkout)
- `src/components/studio-v3/SignaturePriceCard.tsx` (per-chip reasons, empty/bespoke notices, always-visible breakdown + loading affordance)

## Out of scope

- Signed-in server-side draft sync (existing "Save signature" already covers that).
- Redesigning the SignaturePriceCard visual layout.
- Any change to the server quote endpoint or add-on catalog.

Ready to implement on approval.