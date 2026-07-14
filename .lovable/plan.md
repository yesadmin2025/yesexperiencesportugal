
## Problem

On the Studio V3 storyboard (`/studio-v3`), the "Refine your Signature" card is showing the dead-end empty state — *"We couldn't compose a draft for this combination. Adjust the earlier answers and we'll rebuild it."* — even when the resolver has clearly picked a Signature (the hero above shows a real skeleton subtitle like *"A private day, shaped around coast and heritage…"*, the "YES Approved" badge is on, and the Signature DNA chips are populated with valid combos such as *Coastal escape · Friends · Heritage · Photography · Full · Open to guidance · From Lisbon* and *Hidden Portugal · Friends · Nature · Coast · Photography · Balanced · From Lisbon*).

The user can't proceed to price/reserve from these otherwise valid combos.

## Root cause

`baseStops` in `src/components/studio-v3/StudioV3.tsx` (lines 3256–3283) has one branch that returns `[]` even though a skeleton tour exists:

```ts
const outcome = filterStopsBySuitability(rawStops, requirements, pool);
const validity = validateItineraryAfterReplacement(outcome, requirements);
if (validity !== null) {
  if (outcome.stops.length > 0) return outcome.stops;
  if (pool.length > 0) return pool.slice(0, Math.min(2, pool.length));
  return [];
}
return outcome.stops;   // ← can be [] when validity === null and rawStops was already []
```

Two ways this yields `[]` while `skeletonTour` is a real Signature:

1. `curateJourney` returns `journey.moments = []` after coherence + closure filtering, so `rawStops` is `[]`. `filterStopsBySuitability` then returns `outcome.stops = []` with `validity === null`, falling into the last `return outcome.stops` and skipping the pool fallback.
2. Every stop is filtered by suitability, `validity` is `null` (validator treats empty as valid), same path.

`editedStops = state.editedRoutePoints ?? baseStops` → `[]` → the refine editor renders the empty-state dead end even though `skeletonTour.stops` is full of safe candidates. The "swap pool empty" branch is what surfaces the dead-end copy.

## Fix (frontend only, presentation layer)

Single, narrowly scoped change to `baseStops` in `src/components/studio-v3/StudioV3.tsx`:

- Whenever `baseStops` would otherwise be `[]` **and** `skeletonTour` exists **and** `pool.length > 0`, seed from `pool` (the same Signature's own stops) — never leave the editor empty. This matches the existing recoverable-draft comment and the intent of the `validity !== null` branch; the current code just doesn't reach the seed in the `validity === null` path.

New shape:

```ts
const seedFromPool = () =>
  pool.length > 0 ? pool.slice(0, Math.min(3, pool.length)) : [];

if (validity !== null) {
  if (outcome.stops.length > 0) return outcome.stops;
  return seedFromPool();
}
return outcome.stops.length > 0 ? outcome.stops : seedFromPool();
```

Notes:
- Uses `min(3, pool.length)` (up to 3 stops) so the seeded draft feels like a real Signature arc, not a stub. The user then adds/removes via the existing swap pool.
- Only touches the presentation editor. Server-side booking-quote validation is unchanged — an empty or thin route still gets blocked at reserve time by the existing gate.
- No change to `resolveStudioV3Route` or `curateJourney`. This is a UI recovery only, consistent with the philosophy that the storyboard is a "skeleton + refine" surface.

## Verification

1. Reproduce with the two combos from the user's screenshots on mobile viewport 393×588:
   - Coastal escape · Friends · Heritage · Photography · Full · Open to guidance · From Lisbon
   - Hidden Portugal · Friends · Nature · Coast · Photography · Balanced · Open to guidance · From Lisbon
2. Confirm the Refine card now renders real stops with Remove / Swap / Add controls (no dead-end copy), and the "+ Add a moment" button surfaces the same-Signature swap pool.
3. Existing tests to run: `refine-stop-card-integration.test.tsx`, `studio-v3-a11y-axe-sweep.spec.ts`, `studio-v3-full-happy-path.spec.ts`.
4. Add one focused unit test in `src/components/studio-v3/__tests__/base-stops-recovery.test.ts` that asserts: given a resolved skeleton with a non-empty `stops` pool but `resolved.routePoints = []`, the memo returns a non-empty seed slice (1–3 stops) drawn from the skeleton — locking the regression.

## Out of scope

- Rebalancing `curateJourney` scoring so it never returns zero moments — deeper change, separate turn.
- Touching the "swap pool empty" copy — the empty branch will no longer be reachable via valid combos once the seed lands, so the copy stays as a genuine last-resort message.
- Any change to checkout, pricing, or the booking-quote edge function.
