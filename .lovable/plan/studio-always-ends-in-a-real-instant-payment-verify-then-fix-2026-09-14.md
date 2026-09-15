# Studio: always ends in a real, instant payment — verify, then fix

Goal: prove that every day the Studio lets someone design can be paid for immediately, and that the day it proposes actually matches the choices made. Where a run blocks, fix that exact point — no redesign.

Important: I have not yet confirmed *why* payment is blocked. The Studio has several safety gates that intentionally send a day to human review instead of payment (timing fit, pricing certainty, party size, missing details). Any of them can be the cause. So the first step of this plan is a live walkthrough that captures the exact reason, and the fix follows from that evidence.

## Step 1 — Walk the Studio for real, on mobile

At 393px, using the live site in test mode, walk the full flow for a spread of traveller profiles:

1. Wine day (Arrábida)
2. Cheese / hands-on food
3. Tile painting / local life
4. Heritage
5. Faith (Fátima)
6. Coast (Sesimbra)
7. Coimbra / scholarly
8. Larger party (6 and 10 guests)

Plus two desktop spot checks (wine, faith).

For each run I record:
- Did the day it proposed actually contain what was asked for (cheese asked → cheese moment present)?
- Did the Reserve button become active, or did it hand the day to review?
- Did the payment screen open with a real Stripe payment form?

## Step 2 — Name the blocker, fix only that

Every failed run gets its exact stopping point captured (which gate, which message, which value). Then I repair that one point and re-run the whole sweep, keeping the protections that exist for genuinely unsellable days: nothing gets sold that cannot actually be operated.

Where the wrong choices show up, I check whether the mismatch is in how choices are read or how the day is composed, and correct it there — no new invented stops, tours or prices.

## Step 3 — One real payment end to end

For one profile I complete an actual test-card payment and confirm:
- the booking is recorded with the right date, pickup, guests and amount
- the confirmation page shows the paid details
- the guest confirmation email goes out

If Stripe's payment form refuses automated typing (it has before), I'll drive it manually in a scripted session, and if that still fails I'll exercise the real confirmation path with a signed test event — and I'll say plainly which of those produced the evidence.

## Technical notes

- Reuse `e2e/studio-v3-walk-to-reveal.ts` with steered option ids; temporary spec files removed at the end.
- Production surface is `StudioV3.tsx` (Living Atlas reasoning is bridged inside it), so gates to instrument are `finalTimeGate`, `checkoutCommercialState`, `selfServiceResolution`, `instantBookableEligibility`, and the `create-signature-checkout` invocation.
- No changes to pricing tables, inventory, Stripe keys, payment methods, DB schema, or protected generated files.
- `bunx tsgo --noEmit` plus the gated Studio/checkout vitest suites after any edit.
- No publish in this pass.

## What you get back

A per-profile table (right choices? Reserve active? payment opened?), the evidence from the real payment run, each fix with the file it touched, and an explicit list of anything that could not be verified and why.
