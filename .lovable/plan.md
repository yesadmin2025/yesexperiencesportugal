
# Studio matching: stop-level intent tags → tour intent profile → region-aware scoring

## The problem

Today the "why this journey" model reads intents by regex-scanning the tour's title, theme, blurb and stop names. It misses truthful cross-signals — the Évora day is genuinely a wine day, the Arrábida tile factory carries wine + heritage + craft, the Sintra pastry stop is gastronomy — because those intents aren't spelled in the text. Matching then feels arbitrary ("I said wine + nature and got Vicentine coast").

## The fix (one shape, three layers)

Move intent knowledge into the data, where it's inspectable and testable. Every stop declares what it actually delivers; each tour's intent profile is the sum of its stops; scoring compares the guest's chosen intents against that profile, within the region they picked.

### Layer 1 — Stop-level intent tags (source of truth)

Add an `intents` field to `TourStop` in `src/data/signatureTours.ts`:

```ts
type StopIntent =
  | "wine" | "gastronomy" | "heritage" | "culture" | "nature"
  | "coast" | "romance" | "hidden" | "adventure" | "local-life"
  | "craft" | "family" | "slow-luxury" | "spiritual" | "view";

type TourStop = {
  label: string;
  story: string;
  imageTheme: string;
  image?: string;
  focal?: string;
  /** Real intents this stop delivers. Multi-tag is expected and correct. */
  intents: StopIntent[];
  /** Optional weight 1–3 (default 2). Signature moment = 3, light touch = 1. */
  intentWeight?: 1 | 2 | 3;
};
```

Tag every stop across all ~14 Signature tours (~86 stops). Examples of the cross-signals we're finally capturing:

- Évora wine day → Roman temple stop `["heritage","culture"]`, Cartuxa cellar `["wine","heritage"]`, cork farm lunch `["gastronomy","local-life","nature"]`.
- Arrábida wine day → tile factory `["craft","heritage","culture"]`, Livramento market `["gastronomy","local-life","wine"]`, Cristo Rei `["view","spiritual"]`, Arrábida drive `["nature","coast","view"]`, Fonseca `["wine","heritage"]`.
- Sintra romantic day → Pena `["heritage","culture","view"]`, Cabo da Roca `["nature","coast","view"]`, Queijadas `["gastronomy","local-life"]`.

Tags come from what the stop actually is, not from marketing copy.

### Layer 2 — Tour intent profile (derived, cached)

New helper `tourIntentProfile(tour)` in `curation.ts` returns:

```ts
{
  tags: Record<StopIntent, number>,   // summed intentWeight per intent
  dominant: StopIntent[],             // top 3 by weight
  region: string,                     // tour.region normalised
}
```

Memoised by tour id. This replaces `tourContent()`+regex for the interest-coverage axis. Regex helpers remain for feeling/companions tone only (keep them out of the interest math).

### Layer 3 — Region-aware scoring in `scoreTourFit`

Rewire the interest coverage axis of the existing `FitReport`:

1. Candidate pool is already filtered by `destinationIntent` when the guest picked a region. Keep that.
2. For each user interest `i`, look up `profile.tags[i]`:
   - weight ≥ 3 → strong (+8), `satisfied: true`, evidence = the top stop label(s) carrying that tag
   - weight 1–2 → partial (+4), satisfied
   - 0 → missing (−6), satisfied: false
3. Bonus intents the user didn't ask for are **not** scored (asymmetric rule stays).
4. `evidence` on each coverage row is now real stop labels ("Cartuxa cellar", "Livramento market") instead of substring hits, so the "Why this journey" chips + rationale can quote them verbatim.
5. Region tie-break: within the same fit band, tours whose `region` exactly matches a `destinationIntent` region alias win over neighbouring regions — no more Alentejo winning a Lisbon-anchored wine request.

Hard constraints (pickup reachability, companions, rhythm) are untouched.

### Layer 4 — Guardrails and tests

- New unit test `stop-intents.test.ts`: every stop in `signatureTours` has ≥1 intent; every tour's `dominant` includes at least one intent that matches its `theme` (Wine-themed tour must have wine as dominant).
- Extend `curation-fit.test.ts` with the exact cases the user raised:
  - `wine + nature` → must return a tour whose profile has both `wine ≥ 2` AND (`nature ≥ 2` OR `coast ≥ 2`). Vicentine-only stays filtered out.
  - `wine + heritage` in Alentejo region → Évora wine day wins over Arrábida.
  - `craft + heritage` → Arrábida (tile factory carries craft) surfaces even without "wine" asked.
- Debug overlay (`?debug=1`) already prints `FitReport`; extend it to also print the tour's `dominant` tags so we can eyeball matches at a glance.

## Files touched

- `src/data/signatureTours.ts` — add `intents` (+ optional `intentWeight`) to every stop; extend `TourStop` type.
- `src/components/studio-v3/types.ts` — export `StopIntent` union; extend `FitReport.coverage.interests[].evidence` type doc.
- `src/components/studio-v3/curation.ts` — add `tourIntentProfile()`, rewire interest coverage in `scoreTourFit`, add region tie-break; remove interest-side keyword pools (keep feeling/companions pools).
- `src/components/studio-v3/__tests__/stop-intents.test.ts` — new.
- `src/components/studio-v3/__tests__/curation-fit.test.ts` — add wine+nature, wine+heritage-in-Alentejo, craft+heritage cases.
- `src/components/studio-v3/StudioV3DebugOverlay.tsx` — surface `dominant` tags.

No UI copy or visual change in this pass. "Why this journey" chips + rationale already read from `FitReport.coverage.interests[].evidence`, so they'll automatically upgrade from "matched: wine" to "Cartuxa cellar · Livramento market" once the tags land.

## Rollout

One turn. The data edits, scoring rewire and tests ship together — partial tagging would leave scoring inconsistent between tagged and untagged tours.
