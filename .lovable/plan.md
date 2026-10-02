# Tailor instant pricing — always bookable, owner-priced

## Goal
Every Tailor change (add, remove, swap) has a price the owner set in Admin, so every valid day can be reserved immediately. No more "Request this day". Contact and WhatsApp stay as optional help only.

## What changes for the traveler
- "Reserve this day" always opens guest details, then payment, when the day is not empty and fits in the time available.
- The total updates live. A short "Price details" list (closed by default) shows the base price for the group, then each addition or removal with its amount.
- "Your day in detail" in the booking form stays as it is.
- A quiet "Prefer to talk it through? WhatsApp us" link stays available, but nobody is sent there automatically.
- Empty days and days that don't fit stay blocked, with the existing messages.

## What changes for Nídia (Admin)
New page: Admin → Tailor prices.
- Filter by Signature. One row per change the traveler can make: stop removal, winery fewer/extra, lunch add/remove, palace swap.
- Columns: Change | In the day by default | Add € | Remove € | Unit (per person / per group / per vehicle / flat) | Active | Status.
- Status shows **Missing price** in red when a change is offered to travelers but has no amount. Entering 0 is allowed and means "no price change" on purpose.
- A summary at the top: each Signature marked **Complete** or **Incomplete (n missing)**.

## Rule for missing prices (assumption — please correct if wrong)
Until a price is entered, that change is not offered to travelers (the stop simply stays in the day, the winery count can't go lower). As soon as Nídia enters a price, it appears in Tailor straight away. This keeps checkout instant and never invents a price. Before publishing, the Admin summary must show every Signature as Complete.

## Starting values (only already-approved rules)
- Extra winery: Arrábida Wine and Setúbal per the existing approved amounts; 4th winery still needs a stop removed.
- Add lunch +€35 pp where lunch is excluded; remove included lunch −€15 pp (Arrábida Wine).
- Existing approved −5% per principal stop removal (with its existing cap/floor) is kept as the entry for those stops.
- Everything else (fewer wineries, palace, picnic, boat, tile and cheese workshops, ferry, Fátima, Nazaré, Óbidos, Tomar, Coimbra and other "owner review" stops) starts as **Missing price**.

## Cleanup of the previous step
Remove the below-baseline confirmation gate, the server's 409 refusal, the Tailor → Contact automatic handoff and its tests. Contact page returns to its previous behaviour (editorial guide prefill kept).

## Technical details
- New table `tailor_price_rules`: tour_id, action_id (stable stop/action id), action_kind (remove_stop, add_stop, winery_extra, winery_fewer, lunch_add, lunch_remove), default_in_day, add_eur, remove_eur (nullable = missing), unit, active, min_party, max_party, note, updated_at/by. Unique (tour_id, action_id, action_kind). GRANTs + RLS: public read of active rows; admin-only write via `has_role`. Seed migration inserts approved rules and Missing rows for every blueprint action.
- Shared pure pricing module (client and edge function import the same logic file pattern already used by `_shared/pricing.ts`): `total = baseTierPrice(party, age bands) + Σ deltas` by unit; the existing −5% ladder stays expressed as a percentage rule for principal rows.
- Client: Tailor loads rules via query; only actions with a valid price are interactive; ledger built from the same function.
- Server (create-signature-checkout): loads rules from the table, receives only stable action ids, rejects unknown ids, inactive or missing-price actions (400), recomputes every euro, Stripe line amount = server total.
- Tests: pricing module unit tests for each listed scenario; parity test client total == server total == Stripe unit amount × qty; empty/infeasible day still blocked; no `/contact` navigation from Tailor reserve.
- Admin page `/admin/tailor-prices` reusing the price-map table style; linked from More.
- Nothing published. Full suite counts reported exactly.

## Values Nídia will need to enter
Listed per Signature in the Admin completeness view and in the final report.
