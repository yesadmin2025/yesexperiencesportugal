# Tailor instant pricing — revised plan

## Goal
Every Tailor change the traveler can make has an owner-set price, so every valid day can be reserved straight away. No "Request this day", no automatic Contact handoff. Contact/WhatsApp stay as optional help only. Nothing is published.

## What I found (current state)
- Admin Price Map (`/admin/price-map`) edits the Studio moment price list (`studio_composable_stops`): one row per Studio moment, one price in cents, unit (per person / per group / per vehicle / flat), minimum guests, active, plus duration and timing fields. It has search and a region filter and saves all rows together.
- Tailor prices live in code today: −5% per principal stop removed (max −15%, never below 70% of the direct price), extra winery +€20 pp (Arrábida Wine, max 4, the 4th needs a stop removed) and +€25 pp (Évora, max 3), add lunch +€35 pp where lunch is excluded, remove included lunch −€15 pp (Arrábida Wine, applied after the floor). The payment server holds a copy of the same rules.
- The previous step added a below-baseline confirmation gate, a server refusal and a Tailor → Contact handoff. These will be removed.

## A) Data model
New table `tailor_price_rules` — one row per offered direction of one Tailor action:

| Field | Meaning |
|---|---|
| tour_id | Signature id |
| action_id | stable stop id, or winery slot id (e.g. `winery-1`, `winery-3`), or `lunch` |
| action_kind | `stop`, `winery_slot`, `lunch` |
| direction | `add` or `remove` |
| adjustment_type | `fixed_eur` or `percent` |
| adjustment_value | numeric, nullable. Null = Missing price. 0 = intentional no change |
| unit | `per_person`, `per_group`, `per_vehicle`, `flat` (fixed only) |
| policy_group | optional; percent rules sharing a cap/floor (e.g. `principal_removal`) |
| active | offered to travelers when true and priced |
| min_party, max_party | optional |
| note | optional |
| updated_at, updated_by | audit |

Unique (tour_id, action_id, direction).

Small companion table `tailor_price_policies` for shared percent limits, so they are data, not hidden code: policy_group, max_total_pct (0.15), floor_pct_of_base (0.70), applies_before_fixed (true). Seeded with the current approved values.

Winery count changes become explicit slots: going from 2 to 1 is `winery-2 remove`, 2 to 0 adds `winery-1 remove`; 2 to 3 is `winery-3 add`, 3 to 4 `winery-4 add`. This keeps every direction priceable on its own.

## B) Seeding existing approved rules
One migration creates both tables and inserts:
- Each stop currently classed "principal" → `remove`, percent 5, policy `principal_removal`.
- Arrábida Wine `winery-3 add` and `winery-4 add` → €20 pp; Évora `winery-3 add` → €25 pp. The "4th winery needs a removal" rule stays as a structural rule, not a price.
- `lunch add` €35 pp on lunch-excluded Signatures; Arrábida Wine `lunch remove` −€15 pp.
- Every other offered direction inserted with value null (Missing price): fewer wineries, palace, picnic, boat, tile and cheese workshops, ferry, Fátima, Nazaré, Óbidos, Tomar, Coimbra and all "owner review" stops.
- Free viewpoints / photo stops currently classed "descriptive" (removal never changed price) seeded as `remove`, fixed €0, so the existing behaviour is preserved explicitly.

## C) Admin completeness by direction
- Which directions a row needs comes from the Tailor blueprint: a stop in the day by default needs only `remove`; an optional extra needs only `add`; a swappable choice (palace, winery pool) needs both where both are offered. A blank direction that is not offered is not counted.
- Row status: Priced, Missing price (red), Inactive.
- Tour summary: Complete, or Incomplete (n missing). A top banner shows overall Tailor completeness.

## D) What travelers can do
- A change is clickable only if its blueprint allows it and an active, priced rule exists for that direction. Unpriced changes simply aren't offered yet (the stop stays, the count can't go lower); they become available as soon as Nídia enters a price.
- Empty day and infeasible day stay blocked by the existing checks. Nothing routes to Contact.
- "Reserve this day" always opens guest details, then payment.
- A closed "Price details" disclosure shows only price-changing lines: Base private day €X, each change ±€Y, Total €T. Live total updates instantly. "Your day in detail" in the booking form stays.
- A quiet optional "Prefer to talk it through?" WhatsApp link remains.

## E) Client / server / Stripe parity
- One shared pure calculator (same file pattern as the existing server pricing mirror) used by browser and payment server: `total = base party price (tiers + age bands) + percent changes (within the policy cap and floor) + fixed changes by unit`.
- Browser loads public active rules and computes the live total and ledger.
- Payment server receives only stable action ids and directions, loads the rules itself, rejects unknown, duplicate, inactive or unpriced ids (400), recomputes every euro and sends that total to Stripe. Client totals and deltas are never trusted.
- Stripe line items: whichever structure keeps the charged amount exact (a single quantity-1 booking total where unit or age bands make per-person splits inexact). The invariant tested is: live total = server total = amount charged.

## F) Reusing the Admin Price Map
- Extend `/admin/price-map` with a mode switch: "Studio moments" (unchanged) and "Tailor changes". Same page, same table style, search, save-all and error handling. No new admin page.
- Tailor mode adds a Signature filter, tour completeness summary, and columns: Change | In the day by default | Direction | Type (€ / %) | Value | Unit | Active | Status.
- Studio and Tailor prices stay in separate tables because they price different things (a Studio moment's own price vs. a change to a Signature's base). Each has exactly one source; the code constants above are removed and replaced by the table reads, so no price exists in two places.

## G) Migration and rollback safety
- Additive only: two new tables, nothing altered or dropped. Public can read active rows; only admins (existing role check) can write.
- Until prices are entered, Tailor behaves as now for already-approved changes and hides unpriced ones — no invented price at any point.
- Rollback = stop reading the tables; the seeded values equal today's rules, so totals for existing compositions are unchanged.
- The payment server change goes live on the shared backend when deployed; it only adds stricter checks plus the same approved amounts, so live checkouts are unaffected.

## H) Tests
- Calculator: Arrábida 2→1 / 2→0 wineries, 2→3 / 2→4 (+€20 pp, 4th needs removal), Évora 2→1 / 0 and 2→3 (+€25), Tiles 1→0 winery, Sintra palace 1→0, remove picnic / boat / tile / cheese / ferry / Fátima / Tomar / Coimbra each — with test prices exact, and hidden when unpriced.
- −5% ladder, 15% cap and 70% floor reproduced from policy data; lunch −€15 after the floor.
- Server rejects unknown, tampered, duplicate, inactive and unpriced ids.
- Parity: live total = server total = Stripe amount across per-person, per-group, per-vehicle, flat, percent and age-banded cases.
- Empty day and infeasible day still blocked; Tailor never navigates to Contact.
- Admin completeness counts only offered directions.
- Full suite rerun with exact file and test counts.

## I) Values Nídia must enter before publish
The Admin Tailor view will list them per Signature. Expected groups: fewer wineries (Arrábida Wine, Évora, Tiles), Sintra palace removal, picnic, boat, tile workshop, cheese workshop, Sado ferry, Fátima, Nazaré, Óbidos, Tomar, Coimbra, and every stop currently marked "owner review". The exact list with counts will be reported after seeding.

## J) Confirmations
- No manual-confirmation fallback anywhere in Tailor.
- Nothing will be published; public release waits for 100% Tailor completeness.

## Technical cleanup included
Remove `choiceBelowBaseline`, the server 409 refusal, `tailorChoiceIds`, the Tailor → Contact handoff module, its Contact page changes and their tests; restore the pass1b test expectation to the new rule.
