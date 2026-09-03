# Studio always lands on an instantly bookable day

Today Studio can compose a day that fails the final booking gate. When that happens the Reserve button stays disabled and the traveller is told to "remove or swap a moment" themselves. That is a dead end: the person who least knows the operational rules is asked to solve them.

Goal: Studio never presents a day it cannot sell. If the composed day does not certify, Studio repairs it automatically — before it is shown — and only then reveals Your Day.

## What changes for the traveller

- Your Day is always reservable the moment it appears. Reserve is enabled, not explained away.
- If a chosen moment cannot fit the date, the pickup, or the 9-hour door-to-door day, Studio quietly replaces it with the closest verified alternative from the same corridor and interest, or drops it and rebalances the day.
- The traveller is told, in one calm line, what the day became — never asked to fix operations. Example: "Your afternoon shifted to the coast so the day stays comfortable."
- If a taste genuinely cannot be honoured together (for example Faith plus an Azeitão workshop in one day), Studio says so before Your Day and offers the two real days it can build instead — an in-Studio choice, not a blocked button.
- WhatsApp support stays available throughout, as a question channel only.

## How it works

1. **Certify-then-reveal.** After composition, run the existing final gate (`judgeFinalDayTime` plus the operational/pickup/date checks) on the candidate route *before* the reveal instead of only at the CTA.
2. **Deterministic repair loop.** While the day is not certified, apply, in fixed order and using only verified inventory: (a) drop non-anchor moments in ascending contribution order, (b) substitute a closed or unfit moment with the highest-scoring compatible alternative already in the region pool, (c) stop at the minimum-moment floor. Bounded iterations, pure and testable. No invented stops, no new timing or pricing rules.
3. **Honest repair note.** Each repair yields a short derived sentence shown once on Your Day, built from the structural delta that already exists (`describeStructuralDelta`).
4. **Irreducible conflicts move earlier.** If no repair certifies, the incompatibility is surfaced at the interests/Director step as a choice between two real bookable days, using the existing high-signal conflict path — so Your Day is never reached in a blocked state.
5. **Gates stay exactly as strict.** `canReserve`, the door-to-door authority, commercial rules, and all server-side revalidation at the Stripe seam are untouched. Repair changes the *day*, never the standard the day must meet.

## Technical notes

- New pure module `src/lib/studio-v3/dayRepair.ts`: takes the composed route, date, pickup, party and the certification verdict; returns a certified route plus an ordered list of applied repairs. No side effects.
- Call site in `src/components/studio-v3/StudioV3.tsx` between composition and reveal; reuse `finalTimeGate`, `isStopClosedOn`, `pickupDoorToDoor` and the existing swap pools from `momentAuthorship.ts`.
- Conflict escalation reuses `highSignalConflict.ts`; no new UI surface beyond the repair note and the existing conflict card.
- Unchanged: pricing and tiers, rhythm rules, Stripe config (`ui_mode: "embedded_page"`), DB schema, server checkout validation, SEO/homepage/email, generated files.
- Tests: repair loop unit tests (over-budget day, closed-on-date moment, unreachable pickup, irreducible conflict), a regression that Your Day never renders with `data-day-certified="false"`, plus `bunx tsgo --noEmit` and a 393px non-payment Stripe smoke.
