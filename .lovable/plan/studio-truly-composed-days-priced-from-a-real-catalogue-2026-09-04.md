# Studio: truly composed days, priced from a real catalogue

## What changes for the client

Today the Studio quietly narrows a composed day back to the anchor Signature, because only that Signature's own stops can be priced. Cross-Signature moments (a boat inside a cheese day) are dropped with `no-approved-commercial-identity`.

After this change:

- The Signature is only the skeleton: it picks the region, corridor and logistics, nothing more.
- Any verified stop in the same corridor can enter the day — market + tile workshop + boat + lunch in one Arrábida day — chosen because the client asked for it, not because it belongs to one tour.
- Composed moments sit in their natural place in the day (a boat mid-morning, a workshop after lunch), ordered by time and geography. Nothing is appended as a trailing "add-on".
- The price is real and instant-bookable, because every composable stop has an owner-set price.

## Why prices are needed from you

Nothing here invents a price. Right now the only pricing authority for a borrowed moment is the add-on catalogue, which prices as a percentage of the anchor tour's base — fine for a bolt-on, wrong for a stop that is a core part of a bespoke day.

So the plan introduces one owner-controlled price per composable stop, and I will not enable a stop for composition until you have entered its price. Unpriced stops stay excluded (fail-closed) rather than guessed.

**Stops needing a price (Arrábida / Setúbal corridor, first wave):** coastal boat ride, azulejo painting workshop, Azeitão cheese session, winery visit, Sesimbra castle, Livramento market, Portinho / beach stop, Arrábida park drive, Azeitão table lunch. I will list the exact remaining set per region in the admin panel, with a "needs price" badge, so you fill them in as you go.

## Admin panel

New page **Admin → Composable moments** (reusing the existing admin shell and the pricing page patterns):

- One row per composable stop: name, region, corridor, verified duration, source Signature (for truth reference).
- You set: price, pricing unit (per person / per group / per vehicle / flat), optional minimum party, optional supplement notes, active toggle.
- A stop is composable only when `active` and priced. Everything else shows "Needs price" and is invisible to guests.
- Change history: `updated_at` / `updated_by`, so a price change is auditable.

## Technical approach

1. **New table `studio_composable_stops`** (public schema, GRANTs + RLS: public read of active priced rows, admin write via `has_role`). Keys on the canonical `inventoryStopId` from `regionStopPool`, so it cannot drift from real inventory. Columns: stop id, region, unit price in euro cents, pricing unit, min guests, active, notes, audit fields.
2. **Commercial resolution** — extend `resolveCommercialActionId` / `commerciallyPriceable` in `livingAtlasComposer.ts` so a stop is priceable when *either* the anchor's own blueprint covers it (unchanged) *or* an active `studio_composable_stops` row exists for it. The add-on catalogue stays as-is for the Signature/Tailor pages; the composer stops depending on it.
3. **Placement, not appending** — composed moments already flow through `livingDaySpine` / `mealDaypartAuthority`; they will be sequenced by daypart and route order like any other moment, so a boat lands where a boat belongs. No trailing add-on block in the Studio day.
4. **Pricing math** — the composed day total = anchor base (party-tiered, unchanged) + the sum of each composed stop's own line, computed from the table. Server-side quote build and the existing `booking_quotes` / fail-closed exact-tier logic are the only place totals are produced; the client never supplies euros.
5. **Time authority unchanged** — the 540-minute door-to-door budget, conflicts, one-of-groups and `judgeFinalDayTime` still gate the day. A priced stop that does not fit is still rejected.
6. **Regressions** — a boat + cheese Arrábida composition must survive `commercialContainment`, price correctly, and place the boat mid-day; an unpriced stop must be excluded, not free.

## Rollout order

1. Table + admin page (you can enter prices immediately).
2. Composer reads the table; Arrábida corridor first, validated end to end.
3. Remaining regions enabled corridor by corridor as their prices land.
