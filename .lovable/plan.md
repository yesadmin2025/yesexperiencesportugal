## Audit result — Tailor locked stops

The Tailor flow already treats most Signature stops as freely removable. Locks live in exactly one place: `skippable: false` on a `BlueprintStop` in `src/data/tailorBlueprints.ts`. Every other stop is either a Core item the traveller can skip, a Choice pool (pick-N, swappable), or an Optional add-on.

Full inventory of currently locked stops (3 total, across 12 blueprints):

| Tour | Stop | Reason in code | Operationally justified? |
|---|---|---|---|
| `tiles-workshop` | `azulejos-workshop` — Private tile-painting workshop | Defines the product (this IS the tile tour); supplier reservation | ✅ Yes — product-defining, fixed supplier booking |
| `azeitao-cheese` | `quinta-velha` — Cheese-making workshop at Quinta Velha | Defines the product (this IS the cheese tour); supplier reservation | ✅ Yes — product-defining, fixed supplier booking |
| `azeitao-cheese` | `catralvos` — Quinta de Catralvos winery | Sole winery on the tour; removing it turns "cheese & wine" into "cheese only" | ⚠️ Partially — product-defining because it's the ONLY winery, but the lock reason is not surfaced to the customer |

No other blueprint locks any stop. Markets, viewpoints, lunches, all wineries in multi-winery tours, and every optional are already skippable/removable/swappable. So the "arbitrary locked stops" the user is worried about are limited to those three, and two of them are unambiguously justified.

## What changes

Small, targeted correction — no removal of justified locks, but every lock becomes self-explaining and the codebase enforces the "reason required" rule.

### 1. `src/data/tailorBlueprints.ts` — replace `skippable: boolean` with a structured lock

Change the `BlueprintStop.skippable?: boolean` field to:

```ts
lock?: {
  reasonCode:
    | "product_defining"        // this stop IS the tour
    | "supplier_fixed_package"  // included in a fixed Bókun/Viator package
    | "addon_anchor"            // removing breaks a selected add-on
    | "confirmed_reservation"   // slot already booked with supplier
    | "mandatory_transfer"      // pickup / ferry / transfer node
    | "route_integrity";        // removing creates an invalid/unsafe route
  customerFacingReason: string; // shown verbatim in the UI, ≤120 chars
  source: string;               // e.g. "Viator PDP §Inclusions", "Bókun product 12345"
};
```

A stop with no `lock` is removable. There is no generic `locked: true` flag.

Populate for the three existing locks:

- `tiles-workshop / azulejos-workshop` → `product_defining`, "The tile-painting workshop is the heart of this tour — removing it would leave nothing to tailor.", source: "Viator PDP · signature inclusion".
- `azeitao-cheese / quinta-velha` → `product_defining`, "The cheese-making workshop is the heart of this tour — removing it would leave nothing to tailor.", source: "Viator PDP · signature inclusion".
- `azeitao-cheese / catralvos` → `product_defining`, "This is the tour's only winery — removing it drops the 'wine' half of Cheese & Wine.", source: "Viator PDP · signature inclusion".

### 2. `src/routes/tours.$tourId.tailor.tsx` — surface the reason, keep behaviour

- Replace `s.skippable !== false` with `!s.lock`.
- For a locked stop, render the existing lock chip PLUS the `customerFacingReason` inline (not just the `aria-label` tooltip). Keep the "Signature anchor" eyebrow but append a small info line so mobile users see *why*.
- No behaviour change for unlocked stops.

### 3. Enforce the rule in tests (`src/components/studio-v3/__tests__/` or new `src/data/__tests__/tailor-blueprints-locks.test.ts`)

New test asserting that for every blueprint and every stop, `lock` is either absent OR has a non-empty `reasonCode`, `customerFacingReason`, and `source`. This blocks anyone from re-introducing a bare `locked: true`.

### 4. Add-on dependency safety net (already partly handled)

Sweep `src/routes/tours.$tourId.tailor.tsx` add-on state: if any current add-on requires a Core stop (today none do — add-ons here are the `optional` list, not cross-referenced), do nothing. Document in code comment that when a future add-on gains an `anchorStopId`, removing that stop must prompt "remove add-on or restore anchor" per the spec. This is defensive documentation, not a live code path today because no such dependency exists in the current blueprints.

### 5. What is NOT changing

- No Signature itinerary page is touched — `/tours/$tourId` still shows the full curated day.
- No unlocking of the three justified locks (all three define the product purchased).
- No change to Choice pools (already swappable) or Optional stops (already opt-in).
- No change to pricing, map, feasibility, or checkout — those already read the live Tailor state.

### Verification

- Typecheck + existing Tailor tests.
- Playwright smoke on `/tours/tiles-workshop/tailor` and `/tours/arrabida-wine-allinclusive/tailor`: confirm skippable core stops toggle, quote/duration update, locked stops show the customer-facing reason.
- New unit test ensures no future lock ships without a reason.

### Files touched

- `src/data/tailorBlueprints.ts` (schema + 3 lock entries)
- `src/routes/tours.$tourId.tailor.tsx` (read `lock` instead of `skippable`, render reason)
- `src/data/__tests__/tailor-blueprints-locks.test.ts` (new)

### Report I will deliver after implementation

1. Files changed (above).
2. Locks retained with justification (the 3 above).
3. Locks removed: none — no unjustified locks were found.
4. Test results.
