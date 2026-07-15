# Tailor — Winery Operational Data (Phase 2 handoff)

The Tailor flow now allows travellers to select up to **4 wineries** on
wine-forward tours. Whether a selection can be **instantly confirmed**
or requires **manual confirmation** depends on the fields below being
supplier-approved and populated in `src/data/tailorBlueprints.ts`.

**Do not invent any value.** Missing fields = the traveller is routed to
"Request confirmation" instead of Stripe checkout.

## Fields required per winery

| Field | Type | Notes |
|---|---|---|
| `coords` | `{ lat, lng }` | Approved supplier location for real drive-time routing. |
| `openingWindow` | `{ open, close }` `"HH:mm"` | Days-of-week variations to be added when needed. |
| `visitMinutes` | number | On-site visit (cellar walk, vineyard) excluding tasting. |
| `tastingMinutes` | number | Tasting duration; may be 0 if bundled into `visitMinutes`. |
| `pricePerPaxEUR` | number | Approved per-pax price for including this winery. |
| `ageEligibility` | `{ minAge?, adultsOnly? }` | Only set when the supplier restricts admission. |
| `confirmationStatus` | `"instant" \| "manual"` | Missing = treated as `"manual"`. |

## Wineries currently referenced

| Tour | Winery id | Name | Data status |
|---|---|---|---|
| `arrabida-wine-allinclusive` | `jmf` | José Maria da Fonseca | ⛔ all fields missing |
| `arrabida-wine-allinclusive` | `bacalhoa` | Quinta da Bacalhôa | ⛔ all fields missing |
| `arrabida-wine-allinclusive` | `catralvos` | Quinta de Catralvos | ⛔ all fields missing |
| `arrabida-wine-allinclusive` | `piloto` | Quinta do Piloto | ⛔ all fields missing |
| `arrabida-wine-allinclusive` | `palmela` | Adega de Palmela | ⛔ all fields missing |
| `tiles-workshop` | `jmf` | José Maria da Fonseca | ⛔ all fields missing |
| `tiles-workshop` | `bacalhoa` | Quinta da Bacalhôa | ⛔ all fields missing |
| `tiles-workshop` | `catralvos` | Quinta de Catralvos | ⛔ all fields missing |
| `azeitao-cheese` | `catralvos` (core, locked) | Quinta de Catralvos | ⛔ all fields missing |
| `sintra-lisboa-wine` | `colares-winery` (optional) | Adega Regional de Colares | ⛔ all fields missing |
| `arrabida-wine-boat` | `comporta-winery` (core) | Herdade da Comporta | ⛔ all fields missing |
| `alentejo-wine` | 5 estates from Viator pool | (see blueprint) | ⛔ all fields missing |

## Manual-confirmation triggers today

Until the table above is filled per supplier, the following are treated
as manual-confirmation and cannot be booked via Stripe:

- Any selection beyond `pickMin` for a wine-forward tour (i.e. the 3rd
  or 4th winery on Arrábida, 2nd on Tiles, 3rd+ on Alentejo).
- Any winery with `confirmationStatus === "manual"` explicitly set.

## What ships today

- Traveller can select up to `pickMax` wineries per blueprint.
- Feasibility engine rejects 5+ wineries and warns at exactly 4.
- Consequence preview toast on every add ("adds about N min to your day"),
  marked *estimated* until `visitMinutes + tastingMinutes` are approved.
- Adults-only advisory shown when the composition contains minors AND the
  blueprint has a winery surface.
- "Request confirmation" CTA replaces Stripe Reserve when any
  manual-confirmation trigger applies.
- No fabricated extension pricing.

## What ships when Phase 2 data lands

- Instant Stripe checkout for 3rd/4th winery selections that have all
  fields populated.
- Real drive-time via `builder_route_cache` (once coords + cached OSRM
  legs exist) instead of the current category-default dwell.
- Age-eligibility blocks for suppliers with `adultsOnly: true`.
- Per-winery `pricePerPaxEUR` flowing into `estimatedPrice` in place of
  the generic `ADD_STOP_DELTA` legacy delta.
