Render path (questions 1–4)

1. **Route file:** `src/routes/experiences.tsx` (PT twin: `src/routes/pt.experiences.tsx`, same logic).
2. **Card component:** none — the card is rendered **inline** inside `ExperiencesPage` (`signatureTours.map(...)`, lines 109–289). There is no `SignatureCard` component, so every fix must be made in both route files.
3. **Field → source:**


| Field                  | Actual source                                                         | Canonical?                                             |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Title                  | `signatureTours[].title`                                              | No (marketing title) — intentional                     |
| Theme chip / eyebrow   | `signatureTours[].theme`                                              | No — editorial                                         |
| Teaser (blurb)         | `signatureTours[].blurb`                                              | No — legacy editorial, contains factual errors         |
| Highlights (3 bullets) | `getSignatureCardMoments()` → `src/content/signature-card-moments.ts` | **No — hardcoded override, canonical never consulted** |
| Duration               | `signatureDurationLabel()` → SoT `durationText`                       | Yes                                                    |
| Lunch chip             | `signatureIncludesLunch()` → SoT `included`                           | Yes                                                    |
| Region                 | `signatureTours[].region`                                             | No — editorial label                                   |
| Image / focal          | `signatureTours[].img` via `useImportedTourImages`                    | N/A                                                    |
| Rating / reviews       | `VIATOR_META[id]`                                                     | Yes (Viator)                                           |
| Price "From €X"        | `signatureTours[].priceFrom`                                          | Out of scope (pricing frozen)                          |
| Route / CTAs           | `/tours/$tourId`, `/tours/$tourId/tailor`                             | Yes, all 12 valid                                      |


4. **Partially.** Only duration and the lunch chip read the canonical Signature source. Title, teaser and the three highlight bullets — the most visible text — bypass it entirely.

## Discrepancy register

**C1 · Critical — Évora & Alentejo card shows another Signature's content**
Visible: "Palmela & Setúbal Moscatel cellar tastings" / "Long lunch inside an Alentejo winery" / "Coastal Arrábida road back to Lisbon".
Canonical: Évora UNESCO centre · Roman Temple & Chapel of Bones · two selected Alentejo wineries · cork production site; **lunch not included**.
File: `src/content/signature-card-moments.ts` (`evora-alentejo`). Rendered inline in `experiences.tsx`. Cause: hardcoded moments override with no canonical check. Fix: replace trio with canonical highlights. Affects `/experiences` + `/pt/experiences` only.

**C2 · Critical — Tomar & Coimbra advertises a lunch that isn't included**
Visible: "Riverside lunch between UNESCO towns" (+ blurb implies a meal). Canonical: lunch not included. Same file/cause. Fix: replace bullet with Joanina Library timed entry.

**H1 · High — Arrábida/Setúbal Wine: obsolete winery count + guaranteed winery names**
Visible: "Three family cellars, one long lunch"; "Bacalhôa & José Maria da Fonseca tastings"; blurb "Two or three family wineries".
Canonical: two wineries included (selected on availability from a pool), up to four in Tailor; lunch included.
Files: `signature-card-moments.ts`, `signatureTours.ts` (`blurb`). Fix: "Two selected wineries, lunch included" + non-guaranteed phrasing.

**H2 · High — Azulejo (tiles-workshop): guaranteed winery + wrong workshop location**
Visible: "Hand-paint your own azulejo in Sesimbra" (workshop is in **Azeitão**); "Palmela cellar tasting with the winemaker" (canonical pool = José Maria da Fonseca / Farm Catralvos / Bacalhôa, **one** runs, none guaranteed; no Palmela cellar). Same file/cause.

**H3 · High — Boat: obsolete variant and meal wording**
Visible bullets: "Boat into hidden Arrábida coves", "Turquoise-water beaches, no crowds"; blurb "swim, snorkel, drift and lunch by the water".
Canonical: **Sesimbra Coastal Boat Tour**, Lapa de Santa Margarida, Cabo Espichel, Livramento Market; no beach/swim/snorkel stops; lunch own expense.
Files: `signature-card-moments.ts` + `signatureTours.ts` blurb.

**H4 · High — Tróia & Comporta blurb claims an included lunch**
Visible: "…rice fields and a slow Alentejo lunch". Canonical: Comporta lunch is own expense; ferry, Roman ruins, Herdade da Comporta tasting. File: `signatureTours.ts` blurb. Bullet "Ferry across the Sado dolphin estuary" adds an unverified dolphin claim (Medium).
Note: **no duplicate title is rendered** — the card shows one title (`signatureTours.title`); the SoT Viator title is stored but never displayed. No hierarchy defect.

**M1 · Medium — Sintra: ticket package presented as guaranteed**
Visible: "Pena Palace before the crowds" + blurb "a private wine tasting". Canonical: package is *either* one palace + Colares wine tasting *or* two palaces; Pena is a candidate. File: `signature-card-moments.ts` + blurb.

**M2 · Medium — Azeitão: invented shepherd, implied meal**
Visible: "Meet the shepherd behind Queijo de Azeitão"; blurb "sea air and seafood in Sesimbra". Canonical: private cheese workshop at Quinta Velha, Farm Catralvos tasting; lunch own expense.

**M3 · Medium — Fátima/Nazaré: seasonality dropped**
Visible: "Nazaré's giant-wave cliff viewpoint" / blurb "the giant waves of Nazaré". Canonical notes giant waves are a **seasonal winter** phenomenon.

**L1 · Low — Picnic: "Chef-styled picnic"** is not in the canonical record (canonical: private picnic with local cheeses, bread, smoked meats, pastries, fruit, wine). Also confirm Cabo Espichel belongs to the picnic itinerary before keeping that bullet.

**L2 · Low — Roman Talha duration** renders `8–9h` from the canonical record. If the Bible states a different duration, the fix belongs in the SoT entry, not on the card (would then also change the tour page).

**L3 · Low — dead fallback chain.** Lines 114–150 compute `sotStopBullets` → `VIATOR_META.stops` → `content.highlights`, but `curatedMoments` exists for all 12 ids, so the canonical branch is **never** reached. Legacy `VIATOR_META` fallback is unreachable but still present.

## Answers to the checklist

1. **12 cards rendered, in order:** Arrábida Wine All-Inclusive · Wild Beaches & Picnic · Arrábida & Sesimbra Boat · Tile Painting Workshop · Azeitão Cheese · Sintra & Cascais · Tróia & Comporta · Évora & Alentejo · Tomar & Coimbra · Fátima/Nazaré/Óbidos · Roman Heritage · Southwest Vicentine Coast.
2. **Missing Signature:** none.
3. **Duplicated Signature:** none.
4. **Wrong route:** none — all 12 ids resolve to `/tours/$tourId` and `/tours/$tourId/tailor`.
5. **Remaining legacy fallbacks:** `signature-card-moments.ts` (always wins), `signatureTours[].blurb`, `signatureTours[].title`, `VIATOR_META.stops` (unreachable), `signatureTours[].durationHours` (unreachable, all 12 have SoT).
6. **Intentionally editorial — do not replace:** marketing `title`, `theme` chip, `region` label, imagery/focal, CTA labels, hero copy, page metadata. Prices untouched.
7. **Files that would change:** `src/content/signature-card-moments.ts` (9 trios), `src/data/signatureTours.ts` (blurbs only, 7 tours), `src/routes/experiences.tsx` + `src/routes/pt.experiences.tsx` (optional: drop the unreachable fallback chain).

## Minimal correction plan (on approval)

1. Rewrite the 9 affected trios in `signature-card-moments.ts` strictly from each tour's canonical `highlights`/stops, using pool wording ("Two selected Alentejo wineries") instead of guaranteed names.
2. Correct the 7 blurbs in `signatureTours.ts` that assert an included lunch, a wrong winery count, swim/snorkel, or unqualified giant waves. Titles untouched.
3. Optionally add a dev-only assertion that every curated trio matches a canonical highlight/stop, so this class of drift cannot silently return.

Blurb changes also appear on individual tour pages and anywhere `blurb` is reused; card-moment changes affect `/experiences` and `/pt/experiences` only. No pricing, Tailor, Studio, checkout or SEO file is touched.

Implement the approved targeted correction for /experiences.

Do not perform another audit.

Do not analyse the whole repository.

Do not repeat canonical-data, Tailor, checkout, Stripe or Studio work.

Do not redesign the page.

Do not publish automatically.

Change only the following files unless a TypeScript error makes one additional directly dependent file strictly necessary:

- src/content/signature-card-moments.ts

- src/data/signatureTours.ts

- src/routes/experiences.tsx

- src/routes/pt.experiences.tsx

AUTHORITY

Use:

1. the current canonical Signature source of truth;

2. the final approved business rules;

3. the Canonical Signature Bible only where it does not conflict with a newer explicit business decision.

Keep editorial marketing titles, themes, region labels, images, CTA labels, prices and route IDs unchanged.

IMPLEMENTATION

1. ÉVORA & ALENTEJO

Replace all Palmela, Setúbal, Moscatel and Arrábida coastal content.

The card moments must communicate:

- Évora UNESCO historic centre;

- Roman Temple and Chapel of Bones;

- two selected Alentejo wineries;

- traditional cork-production visit.

Do not promise an included lunch.

2. TOMAR & COIMBRA

Remove every implication of an included riverside lunch.

Use canonical moments such as:

- Convento de Cristo and Templar heritage;

- University of Coimbra;

- Joanina Library timed entry.

Lunch is not included.

3. SETÚBAL & ARRÁBIDA WINE

The default Signature is now:

- exactly 2 selected wineries;

- lunch included;

- winery selection depends on availability;

- Tailor may add a 3rd or 4th winery under the existing rules.

Do not guarantee Bacalhôa, José Maria da Fonseca or any named winery on the card.

Use wording such as:

- “Two selected wineries and lunch included”;

- “Setúbal, Azeitão and Arrábida landscapes”;

- “Tailor the day with additional winery options”.

Do not change the existing Tailor implementation.

4. AZULEJO, WINE & SESIMBRA

Correct the workshop location to Azeitão.

Do not guarantee a Palmela winery or any named winery.

Use canonical moments such as:

- hands-on azulejo painting workshop in Azeitão;

- tile firing and shipping;

- one selected regional winery;

- Sesimbra and Livramento Market.

Lunch is not included.

5. ARRÁBIDA & SESIMBRA BOAT

Use only the final approved product:

- Sesimbra Coastal Boat Tour;

- Livramento Market;

- Arrábida Natural Park;

- Lapa de Santa Margarida;

- Sesimbra;

- Cabo Espichel.

Remove:

- swim guarantee;

- snorkelling guarantee;

- private-boat guarantee;

- hidden-cove guarantee;

- “no crowds” claim;

- included “lunch by the water” wording.

Do not describe lunch merely as “own expense”.

The correct commercial state is:

- lunch is not included by default;

- Add Lunch is available in Tailor for +€35 per person.

Do not change pricing or Tailor logic.

6. TRÓIA & COMPORTA

Remove any implication that lunch is included.

Use:

- Sado ferry crossing;

- Roman Ruins of Tróia;

- Carrasqueira stilt pier;

- Herdade da Comporta wine tasting;

- Atlantic beaches.

Remove any dolphin guarantee unless it is explicitly marked as a possibility rather than an included sighting.

7. SINTRA & CASCAIS

Do not present Pena Palace or the Colares winery as guaranteed simultaneously.

The canonical ticket logic is:

- one selected palace plus Colares wine visit;

or

- two selected palace tickets.

Use conditional wording such as:

- “Flexible palace selection”;

- “One palace and wine, or two palace visits”;

- “Azenhas do Mar, Cabo da Roca and Cascais”.

Do not promise queue-free access.

8. AZEITÃO CHEESE & WINE

Remove the invented shepherd claim.

Use:

- private Azeitão cheese workshop;

- regional bread, cheese, chutney and Moscatel;

- selected winery tasting;

- Azeitão and Sesimbra.

Do not imply seafood or lunch is included.

9. FÁTIMA, NAZARÉ & ÓBIDOS

Keep Nazaré but qualify giant waves as seasonal.

Use wording such as:

- “Nazaré’s cliff viewpoint and Atlantic coast”;

- “Seasonal giant-wave scenery in winter”.

Do not imply giant waves are visible year-round.

Lunch is not included.

10. ARRÁBIDA BEACHES & PICNIC

Cabo Espichel is part of the canonical itinerary and may remain.

Replace “chef-styled picnic” with wording based on the actual inclusion:

- private regional picnic;

- local cheeses, bread, smoked meats, pastries, fruit, wine, juice and water.

Do not add an Add Lunch message because the picnic is already the meal component.

11. ROMAN TALHA

Do not change the 8–9h duration.

Do not add an Add Lunch option.

Lunch is already included in the canonical product.

12. FALLBACK CLEANUP

In both:

- src/routes/experiences.tsx

- src/routes/pt.experiences.tsx

Remove the unreachable legacy fallback chain only if it is provably unused because all 12 cards have curated moments.

Do not introduce a new card architecture or extract a new component during this task.

Do not alter editorial marketing titles, themes, regions, images, prices or CTA labels.

VALIDATION

Confirm:

- all 12 cards still render exactly once;

- no route changes;

- no card displays another Signature’s content;

- no excluded lunch is described as included;

- no alternative winery or palace is presented as guaranteed;

- Boat shows only the final approved product concept;

- Picnic retains Cabo Espichel and uses factual picnic wording;

- Roman Talha remains 8–9h with lunch included;

- Portuguese and English routes remain structurally equivalent;

- TypeScript and build pass.

Do not modify:

- pricing;

- Tailor logic;

- checkout;

- Stripe;

- Studio;

- SEO;

- analytics;

- animations;

- route IDs;

- images;

- the global design system.

Return only:

1. exact files changed;

2. exact card-copy changes;

3. whether the legacy fallback was removed or retained;

4. TypeScript/build results;

5. remaining warnings.

Do not publish.