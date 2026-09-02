# Studio V3 — Release UX Audit (read-only) @ HEAD d0d402f1

Verdict: **NO-GO**. A plausible, ordinary 2-guest coastal day cannot self-serve: Reserve is disabled on Your Day and the only live path is a curator hand-off. WHEN / pickup / party are never reached.

## Observed flow (mobile 393px, real traversal)

Persona: coastal feeling → couple → Gastronomy + Local life → balanced rhythm.

1. Intro — "Portugal is the stage. You write the story." → BEGIN
2. "What should we call you?" (optional, Continue/Skip)
3. "How would you like Portugal to feel?" → Coastal escape
4. "Who is travelling?" → Couple
5. "What pulls you in?" (multi-select) → Gastronomy, Local life → Continue
6. "How should the day unfold?" → Balanced
7. Director fork 1 — "How should the coast reach you?" (From the water / On a wild beach)
8. Director fork 2 — "Which quieter Portugal should the day follow?" (Rice fields and river villages / Far from everything)
9. YOUR DAY — "Tróia · Comporta · Alentejo, through coast and local table."

No question repeated or reconfirmed known intent; both forks were same-corridor and material. Director scoping is corridor-bound in code (`directorContext.ts:61-69`, `questionUncertainty.ts:200-206`), so hypothesis (3) is **not** confirmed — no cross-geography forks observed.

Generated Your Day (5 moments): Baía de Setúbal (ferry crossing) → Roman Ruins of Tróia → Marina de Tróia → Cais Palafítico da Carrasqueira → Comporta. Totals shown: ~2h 2m driving / 123 km, 1h dwell each.

CTA state: `RESERVE YOUR DAY` **disabled** (`data-reserve-blocked="true"`), reason line: *"This day needs a quick human check before we can confirm it instantly."* Secondary: "Have a curator confirm this day", "Save this signature". There is **no "Make it real"** affordance; logistics (WHEN → pickup zone → party size) is unreachable. Guest Details / Checkout Summary / Stripe were therefore never reachable on this persona.

## P0 blockers

1. **Ordinary day fails closed to curator.** Root cause is in `StudioV3.tsx:5229-5234` (`canReserve`) — the observed message is the *fallback* branch (`:5252`), which means the failing term is `operationalGate.proven === false` (`StudioV3.tsx:4678-4704`, `validateItinerary(...).status === "incomplete"`) or `finalDayGate.bookable === false` with `fit.evaluable === false` (`finalTimeGate.ts:83-97`). Route legs *did* resolve (real per-leg minutes render), so the likely cause is composed moments lacking structural `stopId`/`durationSource` reaching `toTimeAuthorityStops` (`finalTimeGate.ts:65-77`), or region/category coercion (`category: "village"` for every stop) in the validator call. One instrumented run pins which term is false — this is the single most important fix.
2. **No self-service route exists when the gate trips.** `onRefine` is the only enabled action (`StudioV3.tsx:6187-6196`), contradicting the product rule that all 1–12 guest days must self-serve.
3. **Logistics is unreachable, so door-to-door truth is never validated.** `certifyDoorToDoor` (`doorToDoorAuthority.ts:213`) needs `pickupOriginCoord(pickup)` (`curation.ts:2708-2727`), which is null pre-logistics, and **no call site re-runs it after pickup is chosen** (`LogisticsPhase.onCompose` at `StudioV3.tsx:3550-3600` only checks date closure and party threshold). The 540-min ceiling is therefore never enforced against a real pickup. Hypothesis (1) is partly wrong (no circular bookability gate — `canReserve` never reads pickup/party) but the practical outcome is the same: the traveller stops before admin.
4. **No structural midday window for the table.** Confirmed: `lunch`/`table` in `curation.ts:3586-3660` are content-kind classifications only; `timeAuthority.ts`, `timeDomain.ts`, `resolveTimeBudget.ts`, `timingProjection.ts` contain no midday/clock anchor. Hypothesis (2) confirmed. On this run a Gastronomy-led day produced **no table/lunch moment at all**, while the headline claimed "through coast and local table".
5. **Price presented before party truth.** €484 / €242 per adult is shown on Your Day with an inferred 2 guests, before party size is asked — north-star §8 says no exact price is presented as confirmed before party confirmation.

## P1 engagement / mobile issues (393px)

- No horizontal overflow at any step (measured 0px) — good.
- Dominant CTA is present but **disabled**, with three competing secondary actions beneath it (curator, save, edit) — the strongest visual element is dead.
- Your Day is text-dense: numbered list + "Route breakdown" leg-by-leg block + per-stop dwell repeated three times (badge, list, breakdown). Reads like an operations sheet, not a reveal.
- Imagery is thin during questioning (one atmospheric backdrop; interests step swaps a single `exp-*.jpg`). No canvas/map element rendered at reveal on mobile.
- No progress or orientation indicator across the 0→N Director; the traveller cannot tell how far they are.
- Edit controls ("Shift the mood: More ocean / Slower", "Adjust the moments · 5 moments") are discoverable and appropriately collapsed.
- "Also considered" cross-sell card sits directly under a blocked CTA — it reads as a consolation, not a choice.

## Smallest bounded correction set for release

1. Instrument and fix the one false term in `canReserve` so a fully-scored, in-budget day is bookable (structural identity + `durationSource` on composed moments reaching `toTimeAuthorityStops`; correct category mapping into `validateItinerary`).
2. Keep curator only for genuine hard rejects and 13–14 parties; every scored 1–12 day continues into logistics.
3. Add a post-logistics door-to-door revalidation with the real pickup, before Stripe, failing closed only there.
4. Add a structural midday table window in composition so a gastronomy-led day places a table near midday (or drop the "local table" claim when none exists).
5. Defer the exact price until party size is confirmed; show a from-range on Your Day.
6. Mobile polish: collapse the route breakdown behind a disclosure, single dwell display, add a lightweight progress cue.

No code, files, or settings were changed in this audit.
