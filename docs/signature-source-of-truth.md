# Signature Source of Truth (SoT)

Every Signature tour must match its public Viator product page — overview,
highlights, inclusions, itinerary and per-chapter timings. That contract
lives in **one** file:

```
src/data/signatureToursSourceOfTruth.ts
```

Nothing else may invent content. Every read site is expected to prefer
this file and fall back to the legacy `signatureTours` / `VIATOR_META`
fields only while a tour hasn't been populated yet.

## The 12 Signatures

Two internal ids intentionally point at DIFFERENT Viator products than
their name suggests (kept for SEO history — old URLs 301 in place):

| Internal id | Viator product |
|---|---|
| `arrabida-wine-allinclusive` | P3 · Private Wine Tour Southern Lisbon |
| `wild-beaches-picnic` | P1 · Wild Beaches and Picnic |
| `arrabida-boat` | P12 · Arrábida + Sesimbra with Boat |
| `tiles-workshop` | **P4 · Golf & Wine** (id kept, content = Golf & Wine) |
| `azeitao-cheese` | P9 · Azeitão Cheese Workshop |
| `sintra-cascais` | P10 · Sintra + Cascais Hidden Gems |
| `troia-comporta` | P18 · Tróia + Comporta |
| `evora-alentejo` | **P6 · Setúbal Wine Tour** (id kept, content = Setúbal Wine) |
| `tomar-coimbra` | P8 · Tomar + Coimbra |
| `fatima-nazare-obidos` | P5 · Fátima + Nazaré + Óbidos |
| `roman-heritage-alentejo` | P17 · Roman Wine Tour |
| `southwest-vicentine-coast` | P16 · Southwest Coast |

Canonical URLs live in `CANONICAL_VIATOR_URLS` inside the SoT file.

## Populating a tour

1. Sign in as an admin.
2. Open `/admin/sot-refresh`.
3. Click **Extract** for the tour.
4. Review the generated TS block against the live Viator page (open the
   link in the row header). Confirm real names, real timings, no
   invented stops.
5. Click **Copy TS block**, paste it into `SIGNATURE_SOURCE_OF_TRUTH`
   (alphabetical by tour id), commit, ship.

The extractor is constrained by a strict tool schema — the model is
allowed to return only what the fetched Viator page contains. Per-stop
minutes are `null` unless Viator prints them explicitly.

## Timing convention

Viator publishes ranges like "8 to 9 hours". Studio needs a single
number. **Convention: midpoint, rounded to nearest 5 min.** So "8 to 9 h"
→ 510 min. Set in stone across the codebase.

## Deletion of duplicate fields (Phase C)

Once **all 12** tours have an entry in `SIGNATURE_SOURCE_OF_TRUTH`, the
duplicate fields in `signatureTours.ts` (`description`, `highlights`,
`included`, `durationHours`) and in `signatureToursViator.ts`
(`overview`, `included`, `editorialChapters`) will be removed and all
read sites will point directly at the SoT. Reviews, gallery and pricing
stay in `signatureToursViator.ts` — those are already truth-passed
data, not editorial content.

Until then, callers use the resolver helpers exported from the SoT file
(`sotOverview`, `sotHighlights`, `sotIncluded`, `sotItinerary`,
`sotDurationMinutes`) which return `undefined` on miss so the legacy
value shows.

## Studio timings

Studio v2's `composeRealItinerary` composes from the `builder_stops`
table, not from Signature blueprints. When a Studio session is anchored
to a Signature tour (`blueprintFilter`), the client can read
`sotItinerary(tourId)` for real per-chapter minutes and override the
generic `duration_minutes` on matching stops. This is wired incrementally
as SoT entries are populated.
