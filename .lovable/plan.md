# Studio verification + homepage Portugal map refinements

Two separate pieces of work: (1) a full evidence run on Studio, (2) small map changes on the homepage.

## 1. Studio end-to-end test (no redesign)

Live 393px mobile run on the current preview, plus the focused test suites, to prove:

- Intelligence: a concrete choice produces exactly that experience. Two runs — cheese workshop and tile painting — plus one wine-led run and one heritage-led run, checking the revealed day contains the chosen moment and no substitute.
- Truth: Your Day, Guest Details and Summary all show the same stops, date, pickup and party.
- Bookability: `Make it real` is enabled only with the day certified, and Reserve returns HTTP 200 with a client secret and a mounted Stripe checkout. No payment is made.
- Pricing: the total shown in Your Day, Guest Details and Summary matches the server-derived amount for the same party size, including any supplement (e.g. the Arrábida 4th-winery trade-off). Verified against the existing pricing test suites, not by changing any price.

Anything the run proves broken gets the smallest possible fix, in this priority: wrong experience > total mismatch between screens > blocked reserve on a genuinely feasible day. No new pricing rules, no changes to tiers, Stripe config, database or server validation.

## 2. Homepage Portugal map

Currently the map renders seven region pins covering all twelve Signature days, but several regions are bundled together so the country looks under-served.

Changes:

- Mobile size: reduce the map's maximum width and cap its height so it takes noticeably less of the screen on a phone, while keeping the pins at a 44x44 tap target.
- More regions: split and add pins so each distinct part of the country reads on its own, all still derived from real tours:
  - Tomar & Coimbra (separate from Fátima/Nazaré/Óbidos)
  - Fátima, Nazaré & Óbidos
  - Sintra & Cascais (unchanged)
  - Azeitão & Sesimbra (unchanged)
  - Arrábida & Setúbal (unchanged)
  - Tróia & Comporta (unchanged)
  - Évora & Alentejo
  - Roman Alentejo (its own pin, currently bundled with Évora)
  - Costa Vicentina (unchanged)
  - Lisbon shown as the departure point marker, visually distinct, not a clickable region
- Label placement adjusted so pins that sit close together on mobile don't overlap.

No invented tours, regions or coordinates: every pin keeps real WGS84 coordinates and links only to existing Signature days and existing Local Stories guides.

## Technical notes

- Map data: `src/content/portugal-planner-map.ts` (region list, real lat/lon).
- Map component: `src/components/home/PortugalPlannerMap.tsx` (sizing, pin rendering, label collision).
- Studio run uses the existing mobile walker and focused suites; protected files (`src/generated/brand-audit.json`, `src/integrations/supabase/types.ts` at `PostgrestVersion: "14.17"`) stay untouched.
- Validation: `bunx tsgo --noEmit`, focused Studio + homepage structure suites, and a 393px browser pass with screenshots.
- No publish in this pass.
