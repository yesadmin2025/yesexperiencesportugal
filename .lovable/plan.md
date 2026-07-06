## Studio V3 — Intent-to-Journey fidelity (predictive matching, done right)

**Goal:** whatever the guest picks (feeling + interests + companions + occasion + pickup + rhythm + destination intent + investment), the suggested Signature must be the one that provably best satisfies those inputs — and the guest can see *why*. Wine + nature was one symptom; the underlying scoring model is fragile across every axis. This plan makes it robust and explainable, without inventing tours or content.

### Problems with the current model

`pickPrimaryTour` (curation.ts) adds independent boosts per axis (pickup, interest, destination, discovery, wine, tiles, family/romantic guards). Two structural weaknesses:

1. **Additive-only, no coverage measurement.** A tour scoring +2 on one axis can beat a tour scoring +1 on three axes, even though the second is a better *overall* match.
2. **Feeling→pool is hardcoded.** `FEELING_TO_TOURS["coastal"] = [wild-beaches, arrabida-boat, troia-comporta, southwest-vicentine]` is judged by human hand, not by measuring the tour's actual content. Once new tours are added or renamed, the map drifts.
3. **No hard logistics constraint.** Pickup/rhythm/duration are soft tiebreakers — a half-day Lisbon guest can still be sent to Vicentine Coast (4h drive each way).
4. **No transparency.** Neither the guest nor the debug overlay can see the reasoning.

### The model: deterministic scoring + AI-written explanation

**Rule: facts stay deterministic; AI writes only voice.** This matches the project guardrail (`AI = tone/storytelling only, never invents facts`). The AI is *not* in the tour-selection loop — it only reads the deterministic coverage report and turns it into human copy.

### 1. New scoring model — `scoreTourFit(tour, intent)`

Replace the current additive boosts with a **structured fit report** per candidate:

```
FitReport {
  tourId
  totalScore              // weighted sum, 0–100
  hardConstraints: {
    pickupReachable       // pass/fail — pickup within tour's operational radius + rhythm allows the drive
    companionsAllowed     // pass/fail — no family-only for couples, no romantic-only for corporate/family
    rhythmFeasible        // pass/fail — slow guest → short tours only; immersive → full tours only
  }
  coverage: {
    interests: [{ interest, satisfied: bool, evidence: stopId | 'theme' | 'blurb' }]
    feeling: { match: 'strong' | 'partial' | 'weak', reason }
    occasion: { match, reason }              // proposal/honeymoon → sunset/private stops
    destinationIntent: { match, reason }
  }
  penalties: [ 'wine-asked-but-tour-has-no-wine', 'family-coded-for-couple', ... ]
  boosts:    [ 'wine-explicit', 'tiles-culture-local-life', ... ]
}
```

**Scoring rules:**

- Any failed hard constraint → tour is filtered out entirely (not just penalized).
- `coverage.interests` is measured against the tour's actual `stops[]` + `theme` + `blurb`, not a hardcoded list. Each satisfied interest = +8. Missing user-asked interest = −6 (asymmetric — missing what they asked for hurts more than a bonus they didn't ask for).
- `coverage.feeling` uses semantic keyword match against tour content (same technique as current `INTEREST_KEYWORDS`, extended per-feeling). Strong = +12, partial = +6, weak = 0.
- `occasion` and `destinationIntent` are additive weights on top.
- Deterministic tie-break at end: `alternates` are top-3 in the same fit band (Δ ≤ 8).

**Why this fixes wine+nature and every symmetric case:** a guest asking wine + nature will show `coverage.interests = [wine: satisfied✓, nature: satisfied✓]` only for tours that genuinely cover both (Arrábida Wine has vineyard + park; Southwest Coast has nature but wine=unsatisfied → −6). No hardcoded pool needed.

### 2. Hard constraints — never send guests where they can't go

Add a real logistics gate before scoring:

- **Pickup reachability**: use `stopCoords` haversine → max realistic drive from pickup. Half-day rhythm caps tours to 2h drive radius; full-day caps to 3h. Multi-day is exempt.
- **Rhythm feasibility**: `slow` guest must not be routed to `immersive`-tagged tours; `immersive` guest gets `full`/`immersive` only.
- **Companions coherence**: current family-only/romantic-only guards become hard filters (drop, not penalize) when the mismatch is severe.

Every filtered tour is logged to the debug overlay with the reason, so we can explain "we didn't offer Vicentine because your half-day from Lisbon can't fit the drive".

### 3. Transparency — "Why this journey" surfaces the reasoning

Two audiences:

**Guest-facing:** a 3-chip row at the top of the preview card:

```
Wine · Nature · Slow morning from Lisbon
```

Under it, one sentence written by the AI voice layer:

> "We chose Arrábida because it pairs a family vineyard morning with the coastal park you asked for, all within 40 minutes of your Lisbon pickup."

The AI only rewrites; the *facts* come from the FitReport (interests satisfied, drive time, tour ID → real content). Uses existing `regionalVoice` tone. No invention.

**Debug-facing (`StudioV3DebugOverlay`):** full FitReport for top 3 candidates + list of filtered tours with reasons. Ships behind `?debug=1`. This is how we spot future mismatches before users hit them.

### 4. AI-predictive: where an LLM helps, where it doesn't

Explicit answer to "should AI-predictive behavior work?":


| Layer                                            | Deterministic    | LLM                            |
| ------------------------------------------------ | ---------------- | ------------------------------ |
| Candidate pool                                   | ✅ from tour data | ❌                              |
| Hard constraints (pickup, rhythm)                | ✅                | ❌                              |
| Fit scoring                                      | ✅                | ❌                              |
| Tie-break within top band                        | ✅ seeded         | ❌                              |
| "Why this journey" copy                          | ❌                | ✅ (voice only, from FitReport) |
| Optional: nudge messages when profile is unusual | ❌                | ✅ (voice only)                 |


**Why not LLM re-ranking?** Non-deterministic (same input → different tour), harder to test, adds latency + cost, and risks contradicting the guardrail. Reserve LLM for what it's actually good at: turning structured facts into warm sentences.

### 5. Reshape improvement

When the guest hits "Reshape this day", currently a seeded random pick within Δ 1.5 of leader. Improve:

- Reshape picks the next-best candidate that satisfies a *different* dimension (e.g. current pick maxed on wine → reshape offers one that maxed on nature). Shows genuine alternates, not near-duplicates.
- Cap at 3 reshapes before we ask "Want to change what you're feeling?" and route back to the earlier phase.

### 6. Regression coverage

New test suite `curation-fit.test.ts` covering:

- wine+nature (already added) — must land on wine-anchored tour with nature content
- culture+heritage+family — must land on kid-friendly heritage (Sintra, tiles), never adult-only wine
- romance+coast+proposal — must include sunset/viewpoint stops
- corporate+wine+half-day+lisbon — must land on Arrábida (reachable) not Alentejo (too far)
- solo+hidden+immersive — must land on Southwest Coast or Alentejo Roman, not Sintra tourist loop
- slow+couple+wine — must land on Azeitão/Arrábida, not a demanding full-day
- Every combination asserts at least one satisfied interest AND no failed hard constraint

Snapshot the FitReport for each case so future refactors show exactly which axis regressed.

### 7. Files touched

- `src/components/studio-v3/curation.ts` — new `scoreTourFit`, `filterByHardConstraints`, replace body of `pickPrimaryTour`
- `src/components/studio-v3/types.ts` — `FitReport` type
- `src/components/studio-v3/regionalVoice.ts` — helper that turns FitReport → guest sentence (may call AI gateway later; start with rule-based template)
- `src/components/studio-v3/MapAwakens.tsx` + `SignaturePriceCard.tsx` — render "Why this journey" chip row + one-sentence rationale
- `src/components/studio-v3/StudioV3DebugOverlay.tsx` — surface top-3 FitReports + filtered tours
- `src/components/studio-v3/__tests__/curation-fit.test.ts` — new suite
- Keep the wine-coherence guard I shipped last turn — the new model subsumes it, but the test cases remain valid regressions.

### 8. Rollout

Ship in 3 focused turns to keep each change reviewable:

1. **Turn A** — new `scoreTourFit` + hard constraints + FitReport, wire `pickPrimaryTour` to it, extend test suite. No UI change yet.
2. **Turn B** — surface "Why this journey" chips + one-sentence rationale in `MapAwakens` and price card (rule-based copy from FitReport).
3. **Turn C** — debug overlay + AI voice layer swap (optional — only if the rule-based copy reads flat).

### Out of scope

- Adding new tours, stops, prices, or images — hard guardrail.
- Changing the phase flow (feeling → interests → …). This is a scoring change, not a UX rewrite.
- LLM in the ranking path (see rationale above).

Approve and I start with Turn A: the new scoring model + tests. UI polish (map labels, two-state price card from the earlier plan) still stands as separate turns after this.

Also, besides the skeleton of a signature tour, stops from other signature tours can be used if in the same region, driving times and stop timings and clients tastes allows it. It should be personable but controlled on the back end 