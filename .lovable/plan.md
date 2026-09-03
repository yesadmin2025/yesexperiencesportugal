# Studio checkout validation — always reaches payment and instant confirmation

Goal: prove that any day the Studio lets you design can be paid for immediately and lands on a real confirmation, across a broad set of traveller profiles — not just the four already checked.

No redesign, no pricing/Stripe/DB/protected-file changes. Fixes only if a flow blocks, and only at the exact failing seam.

## Scope of the sweep

At 393px (mobile-first), each profile walks: preflight (future date, Lisbon pickup, party) → feeling/who/interests/rhythm → Director → Your Day → Guest Details → Summary → Reserve.

Profiles:
1. Cheese / hands-on gastronomy
2. Tile painting / hands-on local life
3. Arrábida wine
4. Heritage
5. Faith (Fátima signal)
6. Scholarly / Coimbra
7. Coastal (Sesimbra / south-west coast)
8. Larger party (6 and 10 guests, on a wine day)

Plus two desktop spot-checks (wine, faith) to confirm parity.

Pass criteria per profile:
- `studio-v3-handoff-primary` becomes enabled with `data-day-certified="true"` (no dead end, no curator wording)
- The composed day reflects the chosen signal (cheese asked → cheese moment present, etc.)
- `create-signature-checkout` returns HTTP 200 with a non-empty client secret and `pk_` key
- Stripe Embedded Checkout visibly mounts

## End-to-end payment (test mode)

For one representative profile, complete an actual Stripe **test-card** payment (4242…) inside the embedded checkout, then verify:
- the `bookings` row is created/marked paid by the webhook, with the correct date, pickup, party and amount
- `/booking-confirmed` renders the verified paid details
- the guest confirmation email is enqueued/sent

Known risk to flag up front: Stripe's embedded checkout has previously resisted automated card entry. If the automated card fill is blocked again, I will complete the same proof by driving the checkout manually in a scripted browser session and, if Stripe still refuses automation, by exercising the exact webhook path with a Stripe-signed test event so the booking row, confirmation page and email are still verified for real. I will state plainly which of these produced the evidence.

## If a profile blocks

Capture the exact gate (time authority, commercial ledger, pickup, party, server validation), fix only that seam, keep every fail-closed rule intact, and re-run that profile plus the full sweep.

## Technical notes

- Reuse `e2e/studio-v3-walk-to-reveal.ts` with `preferredOptionIds` steering; temporary spec files are deleted at the end.
- Run against the live site in Stripe test mode.
- `bunx tsgo --noEmit` plus focused Studio checkout/gate suites after any edit.
- `src/integrations/supabase/types.ts` stays baseline with `PostgrestVersion: "14.17"`; `src/generated/brand-audit.json` untouched.
- No publish in this pass.

## Deliverable

A per-profile table (certified? checkout HTTP status? client secret? Stripe mounted?), the payment run evidence (booking row id, confirmation page state, email record), any fix made with its file, and an explicit list of anything that could not be verified and why.
