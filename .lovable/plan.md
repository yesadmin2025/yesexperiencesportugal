
## Why nothing feels right

The last few turns stacked features on top of each other without a shared model:

- Draft persistence writes to `localStorage` on every keystroke AND on Save AND on Clear — three overlapping paths that race each other. Restore fires before the tour is resolved, so add-ons come back "orphaned" or get wiped by the tour-change effect.
- The Save / Clear pill in the header contradicts the "silent restore" the auto-persist hook was built for. Users see two truths (auto-saved + a manual button that also saves).
- Add-on chips read from three different sources (catalog availability, day-rhythm minutes, tour bespoke flag) with reasons computed in the card itself — so a chip can be enabled visually while the click handler still rejects it.
- Price block recomputes on every state change AND on every server quote — "Recalculating…" can stick when the server call is slower than the next local edit.

Result: draft, add-ons, and price are three features fighting for the same state. That's what feels broken.

## The fix — one model, three thin surfaces

Rebuild around a single `useStudioDraft` store that owns *everything the user has chosen* (answers, tourId, add-on ids, guest count, date). Draft, add-ons UI, and price block all read from it. No feature writes to `localStorage` directly.

### 1. Collapse persistence into one hook

- Delete `useStudioV3AutoPersist` + `saveStudioV3DraftNow` + the header pill.
- Replace with `useStudioDraft()` — a single hook that:
  - Hydrates once on mount (server `?saved=` wins, else localStorage, else empty).
  - Writes debounced (500ms) on any change. No manual "Save".
  - Exposes `clearDraft()` only (used by Checkout success + a small "Start over" link in the Studio menu, not a header pill).
- Restore order guarantee: add-ons are held in a `pendingAddOns` buffer until `state.tourId` matches the persisted tourId, then applied atomically. Fixes the wipe-on-hydrate bug.

### 2. Add-ons: one selector, one reason

- Move availability logic out of `SignaturePriceCard` into `selectAddOnAvailability(state, catalog)` — pure function returning `{ id, enabled, reason }[]`.
- The card just renders. The click handler asks the same selector — no more "looks clickable but rejects".
- Reasons collapse to 3 human strings: *"Fits your day"*, *"Needs more time than the day allows"*, *"Max add-ons reached — swap one"*. Bespoke tours show a single card-level notice instead of per-chip reasons.

### 3. Pricing: derive, don't recompute

- One `useStudioQuote(draft)` hook returns `{ total, breakdown, status }` where `status ∈ 'idle' | 'live' | 'stale'`.
- Local math (base × guests + add-ons) is always shown instantly. The server quote replaces it only when it arrives; if a newer edit lands first, the stale response is dropped (request id guard).
- "Recalculating…" only appears when `status === 'stale'` for >400ms — no more sticky spinner.

### 4. Header cleanup

- Remove the Save draft / Clear draft pill. Keep the existing Close (X) only.
- Add a subtle "Draft restored" chip near the phase title for 4s when hydration actually restored something (already spec'd, just wire to the new hook).
- "Start over" lives inside the Close confirmation sheet ("Close and keep draft" / "Close and start over").

### 5. Verify

- Playwright: (a) pick feeling → refresh → answers + add-ons restored; (b) select add-on that exceeds day rhythm → chip disabled with reason, click is a no-op; (c) change guest count → total updates in the same frame, no sticky spinner; (d) checkout success clears draft.

## Files touched

- **Delete:** `src/components/studio-v3/useStudioV3AutoPersist.ts`, the `StudioDraftControls` pill in `StudioV3.tsx`.
- **New:** `src/components/studio-v3/useStudioDraft.ts`, `src/components/studio-v3/selectAddOnAvailability.ts`, `src/components/studio-v3/useStudioQuote.ts`.
- **Edit:** `StudioV3.tsx` (wire the three hooks, remove ad-hoc effects), `SignaturePriceCard.tsx` (render-only), Close sheet component.
- **Tests:** 4 Playwright specs above under `e2e/studio-v3-*`.

## What this does NOT change

- Studio philosophy, copy, layout, brand tokens, or the mobile 393px card widths.
- Server quote endpoint, Bókun readiness, or checkout flow.
- Signature source-of-truth data.

Scope is strictly the three broken behaviours: draft, add-on selectability, live price.
