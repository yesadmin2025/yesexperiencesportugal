# Studio: the day must match the choices (payment path already proven)

## What I verified on the live site

Walking the Studio on a phone (393px), nine traveller profiles plus several unsteered runs all reached a real payment. The Reserve button was enabled and certified in every case, the checkout call returned success, and the Stripe payment box was visibly mounted (313×1124 container, visible Stripe frame, "PAYING NOW €366"). Adding an extra ("boat ride", "Templar Tomar") kept the day certified and bookable.

So "it doesn't go to payment" is no longer reproducible. What is reproducible is the second half of the report: **in some cases the day does not reflect what was chosen.**

Two concrete cases, captured from the live day list:

1. Asked to **make cheese by hand** (hands-on → gastronomy → "making Azeitão cheese"), the proposed day was: Mercado do Livramento · Quinta Velha · a local winery · long lunch in Azeitão · **private tile-painting workshop**. The cheese moment is technically there (Quinta Velha is the cheese estate) but is never named as cheese, and the day ends with a tile workshop nobody asked for.
2. Asked for **the coast seen from the water** (coast → nature → "from the water"), the proposed day was: Mercado do Livramento · Arrábida park · a local winery · long lunch · a second local winery. No time on the water at all — the boat is only offered as a paid extra.

Both days were fully bookable, which is exactly why this reads as "wrong choices" rather than a crash.

## What I will do

1. **Instrument once, then fix at the real seam.** Record, for a set of profiles, the exact answers given and the exact moments composed, so each mismatch is attributed to a specific rule rather than guessed at. The likely seam for case 2 is the step that turns a chosen moment into the day it belongs to; for case 1 it is the moment's traveller-facing name plus an unrequested workshop being kept. I will confirm before changing anything.
2. **Honour an explicit chosen moment.** When someone picks a specific moment (make cheese, paint a tile, see the coast from the water), the composed day must contain that real moment. If the verified inventory cannot express it, the Studio keeps them choosing instead of quietly selling a different day — never invents a stop.
3. **Name the moment the way it was chosen.** The cheese estate reads as the cheese experience, the boat reads as time on the water. Wording only, drawn from existing real content.
4. **Drop moments that contradict the choice.** No tile workshop on a cheese day unless it was actually asked for.
5. **Lock it with tests.** A fidelity test per interest family (wine, cheese, tile, coast-from-water, faith, heritage, photography) asserting the chosen moment appears in the composed day and the day stays instantly bookable. Added to the existing gated suite so it cannot regress.
6. **Re-run the full sweep** on mobile and desktop after the fix: every profile must still reach a visible payment box, and now also show the day they asked for.

## Guardrails kept intact

No pricing, inventory, Stripe, database, or booking-metadata changes. No invented stops, no re-timing, no compressed itineraries. Fail-closed operational gates stay fail-closed. Temporary diagnostic files are deleted at the end.

## Technical notes

- Diagnosis focuses on `exactDirectorObligations.ts` (exact-moment → principal stop, currently only cheese and tile), `livingAtlasDecision.ts` (`DISCOVERY_SIGNAL_TARGET`, 80-point signal weight vs. dimension affinity), `adaptiveQuestions.ts` `REFINEMENT_TO_SIGNAL`, and the composer that turns the elected signature + obligations into route points.
- `arrabida-from-water` maps to the `arrabida-boat` signature; the live coast run resolved to `arrabida-wine-allinclusive`, so either the refinement was not recorded or the obligation is not enforced for signals without an entry in `EXACT_STOP_BY_SIGNAL`. Unconfirmed — step 1 settles it.
- Verification: `bunx tsgo --noEmit`, the gated Studio/checkout vitest suites, and the nine-profile Playwright checkout sweep against production.
- No publish in this pass.
