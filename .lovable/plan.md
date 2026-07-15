# Studio Add-Ons Reactivity — Instant Price Updates

## Diagnosis

Wiring already exists (`SignaturePriceCard` → `onAddOnsChange` → `StudioV3.handleAddOnsChange` → `setSelectedAddOnIds` → controlled rerender), but three defects delay/desync the price:

1. **Controlled `selectedAddOnIds` is a fresh `Array.from(...)` on every render** (line 223–226). Referential inequality retriggers the sync effect at line 300 on every render. That effect calls `onAddOnsChange(buildSummary(...))` unconditionally, which calls `setSelectedAddOnItems(newArrayEveryTime)` in the parent — new array identity → parent rerenders → child rerenders → effect fires again. React usually escapes this via primitive bail-outs on the id list, but under load it produces jank and delays paint of the toggled price.
2. **Optimistic vs source-of-truth ordering.** `commitAddOnIds` in controlled mode calls `onAddOnsChange(buildSummary(next))` (good — instant), then React re-renders with the parent's new `controlledAddOnIds`, and the sync effect fires `onAddOnsChange` again with the SAME ids but a new items array reference — parent state churn, no visible price change.
3. **Chip visual state changes only after parent state round-trips.** `aria-pressed`/highlight read from `selectedAddOnIds` which is `controlledAddOnIds` in controlled mode → depends on the parent round-trip. If the parent update is delayed (batched with other setState), the click feels laggy.

## Fix (frontend/presentation only)

### `src/components/studio-v3/SignaturePriceCard.tsx`

1. **Stabilise `selectedAddOnIds` identity.** Replace the `Array.from` memo with a content-hash memo so equal id lists keep the same array reference:
   ```ts
   const controlledKey = (controlledAddOnIds ?? []).join("|");
   const selectedAddOnIds = useMemo<string[]>(
     () => (isControlled ? [...(controlledAddOnIds ?? [])] : uncontrolledAddOnIds),
     // eslint-disable-next-line react-hooks/exhaustive-deps
     [isControlled, controlledKey, uncontrolledAddOnIds],
   );
   ```
   Now the sync effect fires only when ids actually change.

2. **Optimistic local mirror for instant chip feedback (controlled mode).** Track the last committed id list in a `useRef` and compute chip `selected` from `Set(nextIds || selectedAddOnIds)` where `nextIds` is the just-committed list captured synchronously in `toggleAddOn`. Simpler alternative implemented in this plan: keep `uncontrolledAddOnIds` as the always-updated local mirror even in controlled mode (dual write), and read chip state from the union. Concretely:
   ```ts
   const commitAddOnIds = (next: string[]) => {
     setUncontrolledAddOnIds(next);         // instant local paint
     if (isControlled) onAddOnsChangeRef.current?.(buildSummary(next));
   };
   const effectiveIds = isControlled ? (controlledAddOnIds ?? []) : uncontrolledAddOnIds;
   ```
   Read `effectiveIds` (memoised by content hash) everywhere `selectedAddOnIds` is read today. Chips flip in the same frame as the click; parent state syncs on the next tick without blocking paint.

3. **Dedupe the sync effect.** Only call `onAddOnsChange` from the effect when the id list actually changed since the last emission (compare against a `useRef<string>` of the last emitted joined key). Prevents the redundant re-emit that churns parent items array.

4. **Move price derivations off the round-trip.** `addOnsTotalEur`, `addOnsDisplayPartyEur`, `partyTotalEur`, `perPersonDerived` already depend on `selectedAddOns` (derived from `selectedAddOnIds`). With step 2 + step 1 they recompute in the same render as the click. No further changes.

5. **Visual feedback ≤200ms.** Chip already has `transition-colors duration-200`, `aria-pressed`, gold border, check icon fade, and a 180ms pending shimmer (`pendingAddOnId`). Confirm nothing longer than 200ms:
   - Keep `duration-200` on background/border.
   - Keep 180ms `pendingAddOnId` shimmer (reduced-motion safe).
   - No debounce/setTimeout on the price recompute path.

### `src/components/studio-v3/StudioV3.tsx`

6. **Dedupe `handleAddOnsChange` writes** so `setSelectedAddOnItems` and `setSelectedAddOnsTotalEur` skip identical payloads:
   ```ts
   setSelectedAddOnItems((prev) =>
     prev.length === summary.items.length &&
     prev.every((p, i) => p.id === summary.items[i].id && p.amount === summary.items[i].amount)
       ? prev
       : summary.items,
   );
   setSelectedAddOnsTotalEur((prev) => (prev === summary.totalEur ? prev : summary.totalEur));
   ```
   Stops the render loop the sync effect could trigger.

## Tests

### Unit — `src/components/studio-v3/__tests__/add-ons-reactivity.test.tsx` (new)

- Mount `SignaturePriceCard` with `guests=3`.
- `fireEvent.click(chip)` and, **in the same `act` flush**, assert:
  - chip has `aria-pressed="true"` and `data-state="checked"` (or `pending` then `checked` after 200ms).
  - `studio-v3-party-total` text changed by the expected delta.
  - `studio-v3-base-price[data-per-pax-eur]` === `round(newPartyTotal / 3)`.
- Toggle off in a second click and assert both revert in the same flush.
- Assert no `console.error` (rules out the derivation invariant added last turn).

### Unit — controlled parity

- Mount with controlled `selectedAddOnIds` + `onAddOnsChange` spy. Assert:
  - Chip flips visually **before** the parent has re-supplied new `selectedAddOnIds` (call `onAddOnsChange` spy with a `no-op` and confirm chip state — proves optimistic paint).
  - Spy called exactly once per user toggle (no double emission from the sync effect).

### E2E — existing suites cover the frame-tight contract

- `e2e/studio-v3-add-ons-same-frame.spec.ts` — passes today and will keep passing (stronger dedupe, not weaker).
- `e2e/studio-v3-final-investment-live.spec.ts` — asserts party total updates immediately on each toggle.
- Add an `expect(page.getByTestId("studio-v3-base-price").getAttribute("data-per-pax-eur"))` × `partyCount` ≈ party-total assertion after each toggle in the same spec.

## Out of scope

- No changes to add-on catalogue, checkout server functions, or backend.
- No visual redesign — motion tokens (200ms transition, 180ms pending shimmer) are already brand-spec.

## Rollout

1. Ship the four SignaturePriceCard changes + StudioV3 dedupe in one commit.
2. Run the new unit test + existing `studio-v3-add-ons-*` e2e + `studio-v3-final-investment-live` — all green before merge.
3. Manual mobile QA on `/studio-v3?e2e=1`: reach reveal, tap each add-on chip, confirm chip highlights within 200ms and both per-guest and total numbers change in the same frame.
