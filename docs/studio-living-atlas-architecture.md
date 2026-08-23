# YES Experience Studio — Living Atlas

_Status: implementation foundation · 2026-08-03_

## North star

The Studio must not ask travellers to explain themselves before it has earned their attention. It should help them recognise what belongs in their Portugal day, understand the relative importance of those wishes, and turn them into a real, coherent and bookable experience.

The commercial Signature remains the invisible operational skeleton: region, duration band, price base, inclusions, logistical truth and checkout identity. The traveller sees the composed day rather than a renamed catalogue product.

## Product promise

> There is more than one Portugal. Let’s find yours.

The Studio is neither a tour catalogue, a long form nor an open-ended chatbot. It is a living atlas that reacts to a small number of meaningful choices and explains the consequences of each one.

## Non-negotiable contracts

1. A traveller may select **one to three experience dimensions**.
2. One dimension leads, or two dimensions may share the lead.
3. A third dimension is a required supporting thread, not a licence to create an incoherent day.
4. Explicit destination choice is a hard candidate filter, not a scoring suggestion.
5. Every selected dimension must have visible evidence in the proposed day.
6. All 12 canonical Signatures must have a deterministic discovery path.
7. No route, stop, price, inclusion, availability or partner may be invented by AI.
8. Operational constraints always outrank editorial preference.
9. The Studio must work completely when AI is unavailable.
10. The current production route, checkout and Stripe payload remain unchanged until a reviewed migration explicitly replaces them.

## Experience dimensions

- Faith & reflection
- History & heritage
- Wine & the Portuguese table
- The Atlantic
- Hands-on traditions
- Local life & quieter places
- Nature & open landscapes

These are not decorative tags. Each selected dimension becomes a coverage obligation.

### Lead hierarchy

- **One lead:** this dimension structures the Signature choice and must own a meaningful part of the day.
- **Two co-leads:** the Signature must naturally combine both, or a Precision Fork must clarify which interpretation the traveller wants.
- **Supporting dimension:** must appear through a real stop, experience, meal, landscape or protected moment.

## Entry experience

### Screen 1 — Invitation

A restrained cinematic sequence showing several truthful Portugals rather than one coastal bias.

Primary action: `Begin`

### Screen 2 — Direction

- `Help me find my day`
- `I know where I want to go`

No name request, keyboard or guided/fast mode choice before value is demonstrated.

### Discovery path

Question: `What belongs in your day?`

The traveller selects up to three visual dimensions. The interface then asks:

- `What should lead?`, or
- `Which two should share the day?`

The map reacts immediately and reveals only compatible geographical directions.

### Direct destination path

The traveller selects a canonical destination family. That choice hard-filters candidates. Further questions only refine the day within that destination.

## Precision Fork

A Precision Fork is a single contextual question shown only when two or more Signatures remain genuinely close.

Examples:

- Fátima vs Tomar: living faith or sacred history?
- Évora vs Roman Talha: monumental Alentejo or intimate family tradition?
- Arrábida Boat vs Picnic: movement from the water or stillness on the coast?

A fork must describe a real difference between products. It must never be generic copy or a disguised randomiser.

## Signature reachability contract

Every canonical Signature owns at least one explicit discovery door:

| Signature | Deterministic discovery direction |
|---|---|
| Arrábida Wine | Wine-led, family wineries close to Lisbon |
| Arrábida Boat | Atlantic-led, coast experienced from the water |
| Wild Beaches & Picnic | Atlantic + nature, stillness and beach time |
| Tile Workshop | Hands-on Portuguese craft |
| Azeitão Cheese | Hands-on tradition + regional table |
| Sintra & Cascais | Monumental heritage + Atlantic cliffs |
| Tróia & Comporta | Atlantic + local life, with ruins, rice fields and wine |
| Évora & Alentejo | History + wine, monumental Alentejo |
| Tomar & Coimbra | Templars, ancient orders and scholarly heritage |
| Fátima, Nazaré & Óbidos | Living faith + coast + medieval heritage |
| Roman Talha | History + wine, intimate Roman-rooted family tradition |
| Southwest Vicentine Coast | Atlantic + nature, remote wild coast |

No Signature may depend on array order, fallback luck or model output to be discovered.

## Decision engine hierarchy

1. Explicit destination
2. Lead dimension coverage
3. Required supporting coverage
4. Contextual answer or Precision Fork
5. Operational feasibility
6. Date, pickup, party size and mobility
7. Rhythm and density
8. Companion and occasion fit
9. Stable deterministic tie-break

The engine produces evidence, not only a score:

```ts
{
  signatureId,
  hardConstraints,
  leadCoverage,
  supportingCoverage,
  operationalFit,
  rhythmFit,
  companionFit,
  totalScore,
  evidence,
  missingCoverage,
  forkCandidate
}
```

## Itinerary composer

Once a Signature is selected, the composer works with functional slots:

- operational anchor
- primary experience
- secondary experience
- local moment
- meal or pause
- scenic closing

The composer may replace a winery with a boat, market or workshop when the guest’s profile requires it and the regional/time constraints permit it. Same-type replacement is not sufficient.

Every route point must eventually carry:

```ts
{
  stopId,
  label,
  story,
  type,
  durationMin,
  sourceTourId,
  regionKey,
  routeCluster,
  replaceable,
  availabilityState
}
```

## Review before reveal

The traveller sees a genuine working itinerary under `Your day is taking shape`.

For each replaceable moment, the interface may show no more than two alternatives. Each alternative states:

- what changes;
- why it fits the selected dimensions;
- duration impact;
- price impact, if any;
- operational condition, such as sea or availability.

Accepting a suggestion must update the route, title, duration, persisted state and checkout summary. An informational button that only changes its label is not sufficient.

## AI role — silent concierge

AI is permitted in three narrow places:

1. **Optional intent interpretation:** translate free text into the controlled experience vocabulary. Writing is never required.
2. **Recommendation explanation:** verbalise facts already produced by the deterministic engine.
3. **Final reveal:** write title, subtitle and `Why this fits you` from confirmed real stops and selections.

AI does not select prices, invent stops, determine availability, cross regions, override constraints or control checkout.

All calls require:

- one central provider configuration;
- schema validation;
- timeout and rate limit;
- deterministic fallback;
- caching by non-personal configuration hash;
- usage logging;
- no name or unnecessary personal data sent to the model.

## Current technical baseline

Read-only inspection of the connected Lovable/Supabase database on 2026-08-03 found:

- 10 builder regions;
- 102 builder stops;
- 273 compatibility rules;
- 15 imported tour sources;
- 113 tour-stop relationships;
- 1,171 AI usage log rows.

The database is already enabled through the Lovable project. No production database mutation is part of this foundation commit.

## Delivery sequence

### PR 1 — Truth and taxonomy

- experience dimensions;
- 1–3 selection rule;
- 1–2 lead rule;
- all 12 discovery doors;
- regional metadata corrections;
- reachability tests.

### PR 2 — Signature decision engine

- hard destination filters;
- lead/support coverage;
- confidence and evidence;
- Precision Fork selection;
- deterministic fallback.

### PR 3 — Living Atlas entry and map reaction

- new introduction;
- direct/discovery routes;
- multi-select dimensions;
- lead selection;
- reactive map and progressive clarity panel.

### PR 4 — Real itinerary composition

- identity-rich route points;
- functional slots;
- real duration budget;
- cross-category replacement;
- availability and mobility constraints.

### PR 5 — Review and real suggestions

- working timeline;
- alternatives per replaceable moment;
- persistence;
- route/title/duration/price recalculation.

### PR 6 — Silent concierge AI

- optional interpretation;
- recommendation explanation;
- final reveal;
- central logging, privacy and fallback.

### PR 7 — Final reveal, checkout and Travel File

- one resolved journey source;
- personalised editorial identity;
- pricing and Stripe regression protection;
- post-booking Travel File.

## Acceptance gates

- all 12 Signatures reachable by deterministic tests;
- Fátima reachable through faith and direct destination;
- Tomar reachable through Templar/sacred-history intent;
- Évora and Roman Talha separated by a real fork;
- Arrábida supports one winery + market + boat;
- every selected dimension has evidence;
- no cross-region leakage;
- suggestions alter real state;
- current price tiers, child bands, add-ons and Stripe payload preserved;
- Studio remains functional with AI disabled;
- mobile-first QA at 393px;
- keyboard, screen-reader and reduced-motion support;
- no merge to `main` without reviewed preview and passing regression suite.

## Current flow (verified at 393px, 2026-08-23)

Observed phase order from a real mobile walkthrough:

```text
intro → feeling → who → interests → rhythm → refinement → logistics
      → storyboard (Your Day: map or timeline) → confirmation (reveal)
      → guestDetails → checkoutSummary
```

Honest note on the interpretation beat: it is **not** a dedicated timed
screen in the current build. `UnderstoodBeat` is rendered inline on the
logistics→composition transition and is always skippable; the
`interpretation_viewed` event fires from that inline transition in
`StudioV3.tsx`. Treat it as an inline interstitial, not a phase.
