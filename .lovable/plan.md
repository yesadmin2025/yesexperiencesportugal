## Goal

One source of truth per Signature — `**TailorBlueprints` (Core / Choice / Optional)** — consumed by:

1. Tour detail page (itinerary timeline + route map)
2. Tailor flow (already consumes it; complete coverage)
3. Builder (optionals from blueprint surface as "Optional add-ons" inside that signature's region)

No more parallel `editorialChapters` array to drift out of sync.

## Architecture

```text
TailorBlueprint (src/data/tailorBlueprints.ts)
  ├── core[]      → always included, anchor price
  ├── choice{}    → pick N from pool (e.g. "2 of 5 wineries")
  └── optional[]  → time-permitting / opt-in, may have upcharge
        │
        ├──→ tour page (ItineraryTimeline + RouteMap)
        │       via toEditorialChapters(blueprint)
        │       Core stops in order, then "Choose N…" grouped chapter,
        │       then each Optional flagged optional:true.
        │
        ├──→ Tailor page (already wired)
        │
        └──→ Builder (StudioV3)
                via getSignatureOptionalAddOns(tourId)
                Optionals appear in the "Add to your day" pool when
                the user picks a region that maps to a Signature.
```

Existing `editorialChapters` field on `arrabida-wine-allinclusive` becomes redundant once derived — I'll remove it after migration so there's only one place to edit.

## Truth-pass rules

- Only use stops that already appear in `signatureToursViator.ts` for that tour (or the matching tour.stops). **No invented partners or locations.**
- When uncertain whether a stop is core vs optional, default to **core**. Only mark "Optional" when the Viator page explicitly says "depending on", "optional", or it's clearly an add-on (e.g. boat extension on a wine day).
- When the Viator stops list contains 4+ wineries / viewpoints, that's the "Choice" pattern (pick 2–3 of N).
- Blurbs ≤ 180 chars, factual not marketing.

## Tour-by-tour classification (draft, mobile-readable)


| Tour                       | Core                                               | Choice          | Optional                       |
| -------------------------- | -------------------------------------------------- | --------------- | ------------------------------ |
| arrabida-wine-allinclusive | market, park, tiles, lunch                         | 2 of 5 wineries | Cristo Rei, Sesimbra Castle    |
| wild-beaches-picnic        | market, drive, cove, picnic, village               | —               | Sesimbra Castle, Cabo Espichel |
| arrabida-boat              | boat trip, swim stop, Sesimbra                     | —               | beach extension, lunch         |
| tiles-workshop             | tile factory + workshop, Azeitão village, lunch    | —               | winery, market                 |
| azeitao-cheese             | cheese producer, market, lunch, winery             | —               | tile factory, Arrábida drive   |
| sintra-cascais             | Pena/Regaleira, Sintra vila, Cabo da Roca, Cascais | 1 of 2 palaces  | second palace, Boca do Inferno |
| troia-comporta             | ferry, Comporta beach, lunch, rice fields          | —               | dolphin watch, Carrasqueira    |
| evora-alentejo             | Évora old town, Chapel of Bones, lunch, winery     | —               | megaliths, cork farm           |
| tomar-coimbra              | Convent of Christ, Tomar, Coimbra Univ, lunch      | —               | Conímbriga, Aqueduto           |
| fatima-nazare-obidos       | Fátima, Nazaré, Óbidos, lunch                      | —               | Batalha monastery, Alcobaça    |
| roman-heritage-alentejo    | Évora, Roman temple, lunch, Roman villa            | —               | aqueduct, megaliths            |


I will only commit the classifications I can confirm against each tour's existing `stops` array — if a row above doesn't match the actual Viator data, I'll downscope (smaller Core, no Choice) rather than invent.

## Files

1. `src/data/tailorBlueprints.ts` — add 9 missing blueprints (2 already exist). ~400 lines of curated data.
2. `src/lib/tailor-chapters.ts` *(new)* — `toEditorialChapters(blueprint)` derivation + `getSignatureOptionalAddOns(tourId)` for builder.
3. `src/data/signatureToursViator.ts` — remove the now-redundant `editorialChapters` field + type (or keep type but mark deprecated). Single source = blueprint.
4. `src/routes/tours.$tourId.tsx` — `ItineraryTimeline` + `RouteMap` consume `toEditorialChapters(getTailorBlueprint(tourId))` first, fall back to raw Viator stops only when no blueprint exists.
5. `src/data/signatureTours.ts` — tighten the `blurb`, `intro`, `pace` for each tour to match its blueprint Core (no inventions; remove marketing flourishes that contradict the truthful list).
6. **Builder integration** — locate the Studio V3 add-on pool. If it already pulls from `regionStopPool`/`signatureAddOns`, layer the signature optionals on top when a tour is selected. Otherwise expose them as a new "Signature optionals" group inside the add-ons panel.

## Validation

- `tsgo` typecheck after each batch.
- Playwright (mobile viewport 393×800): visit `/tours/<id>` for 3 sample tours (arrabida-wine, sintra-cascais, evora-alentejo) — verify chapter count drops to 4–7, "Optional" pill renders, map markers match.
- Visit `/tours/<id>/tailor` for the same 3 — verify Core / Choice / Optional sections render and feasibility status updates when toggling optionals.
- Builder: open Studio V3, pick Setúbal/Arrábida region — verify Sesimbra Castle + Cristo Rei appear as Optional add-ons.

## Out of scope

- No Stripe / Bókun / pricing changes.
- No copy rewrites beyond truth-pass on blurb/intro/pace.
- No new images, no layout changes beyond the "Optional" pill already shipped.

## Risk / open question

The Builder's current add-on logic is region-based, not signature-based. Surfacing **per-signature** optionals there might require a small refactor of the add-on panel. If that touches more than ~50 lines or breaks Studio philosophy (configurator vibe), I'll stop and propose a narrower wiring (e.g. only show signature optionals when the user has clearly anchored on one signature) before shipping.

Confirm and I'll execute.

&nbsp;

O builder pode utilizar paragens da região desde que o timing faça sentido e exista truth 