# Slice C closure — populate & enforce real suitability

Scope: only the production-readiness gap. No checkout / Stripe / Bókun / visual changes.

## 1. Type + semantics: `SuitabilityRecord` with explicit status

Extend `src/lib/pricing/travellerSuitability.ts`:

```ts
export type SuitabilityStatus = "confirmed" | "explicitly-unrestricted" | "unknown";
export type SuitabilityRecord = TravellerSuitability & { status: SuitabilityStatus };
```

New reason: `"suitability_not_ready"`.

Rewrite `checkTravellerSuitability(record, req, capacity)`:

- `record === undefined` OR `record.status === "unknown"`:
  - If `req` contains ANY minor (`ages` includes an age < 18) → `{ ok: false, reasons: ["suitability_not_ready"], unsupportedAges: [] }`.
  - Else (adult-only) → `{ ok: true }` (backward compat).
- `status === "explicitly-unrestricted"`: skip safety-dependent field defaults; only enforce explicit `minimumAge/maximumAge` (both usually undefined here). No implicit `infantsAllowed=true`.
- `status === "confirmed"`: enforce every listed rule as before; missing fields on a confirmed record mean "no restriction on that axis" (author has attested).

Safety-dependent fields that must NEVER silently default when a minor is present: `infantsAllowed`, `childSeatSupported`, `capacityCountsAllTravellers` — enforced by the unknown-blocker above.

Keep `requirementsFromComposition` unchanged.

## 2. Populate `STUDIO_TOUR_SUITABILITY` for every reachable Signature tour

Reachable = every `id` in `src/data/signatureTours.ts` (currently 12: `arrabida-wine-allinclusive`, `wild-beaches-picnic`, `arrabida-boat`, `tiles-workshop`, `azeitao-cheese`, `sintra-cascais`, `troia-comporta`, `evora-alentejo`, `tomar-coimbra`, `fatima-nazare-obidos`, `roman-heritage-alentejo`, `southwest-vicentine-coast`).

Rewrite `src/data/studioTourSuitability.ts` to export a `SuitabilityRecord` map. Every tour ID present, none `unknown`:

- Tours with a real operational restriction → `status:"confirmed"` + explicit fields:
  - `arrabida-boat`: `minimumAge:4, infantsAllowed:false, strollerSuitable:false` (boat ride — infants and strollers not carried).
  - `arrabida-wine-allinclusive`: `status:"confirmed"`, `infantsAllowed:true, strollerSuitable:false` (winery cellars); no minimum age (kids may accompany, tastings adults-only handled by the venue).
- All other tours (private full-day vehicle experiences visiting towns, viewpoints, workshops, beaches): `status:"explicitly-unrestricted"` (`infantsAllowed:true` implicit only via the "explicitly-unrestricted" status; no capacity override — Bókun categories already gate seats).

Also export `STUDIO_TOUR_CAPACITY` for the ones we know (private vehicle = 7 pax for the standard Mercedes V-class fleet); leave undefined where unknown (capacity is optional).

## 3. Populate `STUDIO_STOP_SUITABILITY` for every reachable stop

Reachable = union of `signatureTours[*].stops[*].label` (~68 unique) and `REGION_STOP_POOL[*].name` (~55). Rewrite `src/data/studioStopSuitability.ts` with lowercase-keyed records; matching helper stays as-is.

Classification rules (operational, not marketing):

| Category | Records | Status | Fields |
|---|---|---|---|
| Boat / island transfer | `Ilha do Pessegueiro`, `Marina de Tróia`, `Baía de Setúbal — Sado ferry crossing` | confirmed | `minimumAge:4, infantsAllowed:false, strollerSuitable:false` |
| Caves / steep-descent | `Lapa de Santa Margarida` | confirmed | `minimumAge:8, infantsAllowed:false, strollerSuitable:false` |
| Beaches (sand access) | `Comporta Beach`, `Praia do Carvalhal`, `Praia da Nazaré`, `Praia de Galapinhos`, `Praia das Bicas`, `Praia do Meco`, `Portinho da Arrábida` | explicitly-unrestricted | `strollerSuitable:false` |
| Winery estates / cellars | `Adega Regional de Colares`, `Bacalhôa Vinhos de Portugal`, `Adega Coop. de Palmela`, `Adega do Mestre Daniel · XXVI Talhas`, `Albergaria dos Fusos`, `Centro Interpretativo do Vinho de Talha`, `Enoturismo Cartuxa`, `Ervideira`, `Herdade do Esporão`, `João Portugal Ramos Wines`, `Pêra-Grave · Qta S. José de Peramanca`, `Quinta Velha`, `Quinta do Piloto`, `Quinta de Catralvos` / `Farm Catralvos`, `Quinta da Regaleira`, `House & Museum José Maria da Fonseca` / `José Maria de Fonseca`, `Azeitão — long traditional lunch` | explicitly-unrestricted | `infantsAllowed:true` (visit ok; tastings supplier-gated) |
| Historic city centres / villages / palaces / museums / squares / lookouts | remaining ~55 town/palace/viewpoint labels (Sintra, Cascais, Sesimbra, Óbidos, Évora, Tomar, Coimbra, Fátima, Nazaré, Setúbal Market, all palácios/castelos/capelas, viewpoints, natural parks) | explicitly-unrestricted | (no per-field restriction) |
| Coast walks / rugged nature parks where stroller is impractical | `Cabo Espichel`, `Cabo da Roca`, `Parque Natural da Arrábida`, `Parque Natural do Sudoeste Alentejano e Costa Vicentina`, `Odeceixe`, `Aljezur`, `Vila Nova de Milfontes`, `Porto Covo` | explicitly-unrestricted | `strollerSuitable:false` |
| Anything not in the above categories at time of population | none (registry closed to the reachable set) | — | — |

Every reachable label MUST be present. A completeness test asserts:
- for each `label` in the reachable set: `getStopSuitability(label)` returns a defined record and `record.status !== "unknown"`.

If a future stop is added and hasn't been classified, its lookup returns `undefined` → treated as `unknown` at runtime → for minors it's blocked; the completeness test fails at CI, forcing an explicit classification.

## 4. Enforce unknown behaviour end-to-end

`filterStudioCandidatesBySuitability` — surface a distinct reason:

- Existing Slice B exclusion → reasons `["category_unresolved"]` (unsupported_age).
- Unknown record on a minor-carrying request → reasons `["suitability_not_ready"]`.
- Confirmed with age failure → reasons `["unsupported_age"]` (+ `unsupportedAges`).

Return shape adds `firstBlockingReason: "suitability_not_ready" | "unsupported_age" | null` computed from the final excluded list, so the caller can surface the distinct error.

`filterStopsBySuitability` — same treatment: `removed[i].reasons` already carries the reason list; when `dropped[]` is non-empty AND all replacements from the pool are also blocked, the outer caller must know.

`StudioV3.tsx` — after `filterStopsBySuitability` runs on `baseStops`, add an itinerary validity guard:

```
validItinerary =
  outcome.stops.length >= 1
  && new Set(outcome.stops.map(s => s.label.toLowerCase())).size === outcome.stops.length
  && outcome.stops.every(s => isCompatible(s.label, requirements))
```

If `!validItinerary`, force the same "unsupported" path that Slice B already uses (`ageFilterStatus:"unsupported"` behaviour) — sets `compatibleTourIds` empty via a new flag `itineraryBlockedReason` threaded into the existing gate. No quote, no Stripe.

## 5. Itinerary validation after replacement

`filterStopsBySuitability` gains internal invariants:
- `used` set already prevents duplicate labels — add a defensive `assert` (throws) if a duplicate slips through.
- Never returns a stop whose `getStopSuitability(label)` is unknown when minors are present (guaranteed by the compatibility check already there — reasserted via test).
- `assertStudioCommercialIdentity` stays at quote build (unchanged).

## 6. Tests (added to `src/__tests__/sliceC.suitability.test.ts`)

Only add, do not remove:

1. **Registry completeness — tours**: every `signatureTours[*].id` has a `SuitabilityRecord` with `status !== "unknown"`.
2. **Registry completeness — stops**: every label from `signatureTours[*].stops[*].label ∪ REGION_STOP_POOL[*].name` has a record with `status !== "unknown"`.
3. **Unknown candidate + minor** → excluded with reason `suitability_not_ready` (uses a mocked tour registry entry with `status:"unknown"`); adult-only same request passes.
4. **Unknown stop + minor** → `filterStopsBySuitability` removes/replaces it; when the pool has a compatible alternative, it swaps; when it doesn't, the stop is dropped.
5. **All stops incompatible** → outcome has `stops.length === 0`; caller-side guard returns `hasCompatible:false` equivalent; no quote fetch attempted (spy on `fetchBookingQuote` reference — the pure helper contract already blocks upstream, so this asserts the pure guard boolean rather than mocking the whole StudioV3 component).
6. **Adult-only backward compat** — unknown record + no minors → `checkTravellerSuitability` returns `ok:true`; wrapper keeps candidate as compatible.
7. **No duplicate replacements** — pool contains only one compatible alt; two incompatible input stops → first slot swapped, second dropped; result has no duplicated labels.
8. **No Signature pricing leakage** (existing test unchanged; assertStudioCommercialIdentity still throws for Signature IDs).

## 7. Verification commands

```
bunx vitest run src/__tests__/sliceC.suitability.test.ts src/__tests__/sliceB.wiring.test.tsx src/__tests__/sliceB.closure.test.tsx
bunx tsgo --noEmit
```

## Files touched

Edited:
- `src/lib/pricing/travellerSuitability.ts` — add `SuitabilityRecord`/`SuitabilityStatus`, add `suitability_not_ready` reason, rewrite `checkTravellerSuitability` for unknown-minor blocking.
- `src/lib/pricing/filterSignatureCandidatesForAges.ts` — thread status through excluded reasons; add `firstBlockingReason` to result.
- `src/components/studio-v3/stop-suitability.ts` — dedupe assertion; ensure returned stops all pass the compatibility check.
- `src/data/studioTourSuitability.ts` — full 12-tour registry, 0 unknowns.
- `src/data/studioStopSuitability.ts` — full reachable-stop registry, 0 unknowns.
- `src/components/studio-v3/StudioV3.tsx` — post-filter itinerary validity guard forces the existing "unsupported" gate when the itinerary would be empty/invalid.
- `src/__tests__/sliceC.suitability.test.ts` — new tests per §6; existing 12 pass unchanged.

Untouched: Stripe webhook, Bókun functions, checkout, quote state machine, admin, visual/UI.

## Out of scope

- Populating stops added AFTER this migration — the completeness test forces future contributors to classify explicitly.
- Slice D.

## Return format after build

Registry coverage counts · unknown records remaining · runtime fallback result summary · vitest output · tsgo output.
