# Tailor + Builder truthfulness pass

Three problems to fix together, all driven by the same root cause: nothing today encodes what each tour **really** includes, what is **optional under availability**, and how much **time** each stop actually takes.

## 1. Tailor: what's *included* vs *optional* (per Signature)

Currently the Tailor screen shows everything as "included" or "add-on" with no relation to the Viator/Bókun reality. Example — Wine & Heritage: Viator says **"visit to 2–3 wineries (subject to availability)"** at a fixed price; we list 5 as included. Cristo Rei and Castelo de Sesimbra are also **optional viewpoints**, not core stops.

Fix: add a per-tour `tailorBlueprint` in `src/data/signatureTours*.ts` with three buckets per Signature:
- **Core (always included)** — what the anchor price actually buys. Wine tour core = lunch + 2 wineries.
- **Choice pool (pick N, subject to availability)** — e.g. "Choose 1 additional winery from: Bacalhôa · José Maria da Fonseca · Venâncio Costa Lima · Casa Ermelinda Freitas". Price stays flat; availability is checked at booking.
- **Optional viewpoints / add-ons (time-priced)** — Cristo Rei, Castelo de Sesimbra, Cabo Espichel, sunset extension. Each carries a real time cost and (where it exists) a real upcharge.

Tailor UI (`/tours/$tourId/tailor`) becomes 3 sections instead of one flat list, with a live **"Day timing"** strip at the top.

## 2. Time-feasibility rules (Tailor *and* Builder)

Put one shared rule engine in `src/lib/feasibility.ts`:

```text
- Dwell minimums (cannot be shorter):
    winery visit + tasting: 90 min
    lunch (sit-down):       75 min
    boat trip:             150 min   (≥120 even shortest variant)
    monastery / palace:     60 min
    viewpoint / chapel:     20 min
    beach / picnic:         90 min
- Drive: real OSRM minutes between consecutive stops + 10 min buffer
- Day envelope: 09:00 → 19:00 = 600 min total
- Hard caps: max driving 180 min/day, max experience 480 min/day
- Boat rule: if any boat stop is chosen → max 3 other stops, no second
  "long" stop (winery/lunch counted long; viewpoint short)
- Wine rule: max 3 wineries/day (Viator constraint), lunch mandatory between
- Sintra rule: max 2 monument interiors/day (queues)
```

Both Tailor and Builder call `evaluateDay(stops[])` → returns `{ feasible, totalMin, drivingMin, warnings[], suggestions[] }`. UI shows warnings inline ("Adding the boat means you'd need to drop one winery") instead of silently overpacking.

The Builder composer in `src/lib/studio-v2/itinerary.server.ts` already has `DEFAULT_CAPS`; extend it with per-tag dwell minimums and the boat/wine rules above so it stops proposing 3-hour boats alongside 4 other stops.

## 3. Email domain switch

Replace every literal `@yesexperiences.pt` with `@yesexperiencesportugal.com` in copy, footer, Stripe receipts, edge-function senders, JSON-LD, and `notify.` templates. The MX on the `.pt` domain stays alive for legacy inbox forwarding (separate concern), but no outbound surface references `.pt` anymore.

## Files touched

- `src/data/signatureTours*.ts` — add `tailorBlueprint` per tour (core / choice / optional)
- `src/data/stopOperational.ts` — fill dwell minutes for every stop key
- `src/lib/feasibility.ts` *(new)* — shared rule engine
- `src/components/tailor/*` — 3-section Tailor UI + live day-timing strip
- `src/lib/studio-v2/itinerary.server.ts` — wire feasibility rules into composer (boat/wine caps, dwell minimums)
- Search/replace `yesexperiences.pt` → `yesexperiencesportugal.com` in copy + edge fns
- E2E: extend `e2e/bokun-checkout-coverage.spec.ts` with a "Tailor truthfulness" assertion (no tour shows >3 wineries as "included")

## Out of scope (this pass)

- Stripe / Bókun integration changes
- Studio V3 visual changes
- Real-time availability calls during Tailor (we mark "subject to availability" in copy; actual lock happens at checkout via existing `bokun-availability`)

## Order of work

1. Author `tailorBlueprint` for the 3 most-booked Signatures first (Wine & Heritage, Sintra Royal, Arrábida Coastal) — verify against the live Viator pages.
2. Build `feasibility.ts` + unit tests.
3. Refactor Tailor UI to 3 sections + day-timing strip.
4. Wire feasibility into Builder composer.
5. Email domain sweep.
6. Roll out remaining 8 Signatures using the same blueprint shape.