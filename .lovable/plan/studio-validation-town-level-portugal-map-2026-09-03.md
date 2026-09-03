# Studio validation + town-level Portugal map

Two pieces of work: prove the Studio always ends in an immediate booking, and turn the homepage map from nine broad regions into real towns.

## 1. Studio validation (no redesign)

A live 393px mobile run on the current build, four times, each with a different intent, plus the focused test suites:

- Cheese workshop (Azeitão)
- Tile painting workshop
- Wine-led day (Arrábida)
- Heritage-led day (Évora / Roman Alentejo)

For each run I check, and report as evidence:

- The revealed day contains the exact moment chosen, with no substitution.
- Your Day, Guest Details and Summary show the same stops, date, pickup, party and total.
- `Make it real` is enabled only when the day is certified.
- Reserve returns HTTP 200 with a client secret and a live publishable key, and Stripe Embedded Checkout visibly mounts and scrolls into view. No payment is made.
- Pricing matches the server-derived amount for the same party, including any supplement.

Anything a run proves broken gets the smallest possible fix, in this priority: wrong experience first, then a total mismatch between screens, then a blocked reserve on a genuinely feasible day. No new pricing rules, no changes to tiers, Stripe configuration, database or server validation.

## 2. Homepage map — towns, not regions

Today the map shows nine grouped region pins ("Costa Vicentina", "Évora & Alentejo"). It will instead show the individual towns and places the private days actually visit, all derived from the existing stop gazetteer with real coordinates — nothing invented.

Town pins, north to south:

```text
Coimbra · Fátima · Nazaré · Tomar · Óbidos
Sintra · Cascais · Cabo da Roca · Lisbon (departure marker)
Azeitão · Sesimbra · Setúbal · Arrábida · Portinho
Tróia · Comporta
Évora · Reguengos de Monsaraz · Vidigueira
Vila Nova de Milfontes · Odeceixe
```

How it behaves:

- Each pin is a real place from an existing Signature day; tapping it shows the private days that visit it and the guides that cover it.
- Pins stay 44x44 tap targets on mobile; only the selected pin shows its label, so close-together towns never overlap.
- The Lisbon marker stays visually distinct as the departure point, not a bookable pin.
- The map stays at its current reduced mobile size.
- A test asserts every pin resolves to a real coordinate and to at least one existing tour, so the map can never drift from the catalogue.

## Technical notes

- Pin source: `src/data/stopGeo.ts` (real WGS84) joined to `signatureTours` stops, replacing the hand-grouped list in `src/content/portugal-planner-map.ts`.
- Rendering and label collision: `src/components/home/PortugalPlannerMap.tsx`.
- Studio run uses the existing mobile walker and focused Studio/checkout suites.
- Validation: `bunx tsgo --noEmit`, focused Studio + homepage structure suites, 393px browser pass with screenshots.
- Protected files (`src/generated/brand-audit.json`, generated Supabase types) untouched. No publish in this pass.
