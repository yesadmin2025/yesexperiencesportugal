# Studio choice fidelity and instant checkout repair

## Goal
Make the live Studio honor the traveller’s exact Director answers and allow payment whenever the resulting day passes the existing date, pickup, party, route, time, commercial, pricing, and server checks.

## Confirmed findings
- The Director records `hands-make-cheese` correctly and maps it to the real `azeitao-cheese` direction.
- That concrete answer is not carried into Living Atlas composition as a required structural stop; composition currently requires only the generic `workshop` type. A tile workshop can therefore satisfy the requirement even after cheese was chosen.
- Faith and the Azeitão cheese workshop may be geographically incompatible in one bookable day. The current flow can collect both answers without resolving that conflict before presenting Your Day.
- The Your Day CTA additionally depends on client-side route-leg validation through `operationalGate.proven`. This can leave Reserve disabled even when the deterministic final time and door-to-door authorities could certify the day; the payment seam already rechecks the route and the server remains fail-closed.

## Implementation
1. **Carry exact Director choices into composition**
   - Derive concrete, verified moment obligations from canonical `questionHistory`.
   - Map cheese to the existing `quinta-velha-cheese-workshop` inventory identity and tile painting to `azulejos-painting-workshop`.
   - Feed these identities into the existing `mustIncludeStopIds`/principal-stop path; do not create stops, suppliers, prices, or a parallel composer.

2. **Resolve incompatible choices before Your Day**
   - Keep the live 0→N Director flow.
   - Filter or resolve follow-up options against the already selected direction and current preflight-eligible pool.
   - When Faith plus an Azeitão workshop cannot fit one certified day, keep the traveller inside Studio and ask for a clear choice/trade-off rather than silently replacing cheese with tiles or dropping either preference.
   - Commit Your Day only when every selected high-signal choice has verified structural coverage.

3. **Repair the Reserve gate without weakening checkout safety**
   - Reproduce the reported 393px flow and capture the exact disabled-gate reason.
   - Remove client route-fetch availability as an independent payment prerequisite if it is the blocker; retain the deterministic final-time, door-to-door, exact-date, pickup, party, exact-tier, commercial, and server-side validations.
   - Keep actionable in-Studio adjustment copy for genuinely non-bookable combinations. Do not add curator or lead-capture fallback.

4. **Regression coverage**
   - Add focused tests proving `hands-make-cheese` produces the cheese workshop and never the tile workshop.
   - Cover Faith + workshop sequencing and the incompatible-choice trade-off.
   - Preserve and rerun Faith + Workshops and scholarly/Coimbra semantic regressions.
   - Add/adjust a Your Day gate regression proving valid certified days can continue while invalid days remain blocked.

5. **Verification**
   - Run focused Studio semantic/composition/checkout tests and `bunx tsgo --noEmit`.
   - Run a real 393px preview flow from preflight through Your Day, Guest Details, Summary, and Reserve.
   - Confirm checkout HTTP 200 returns a non-empty `clientSecret` and `pk_…` publishable key, and Stripe Embedded Checkout mounts. Do not submit payment or publish.

## Boundaries
- No redesign, new architecture, invented inventory, pricing/tier changes, database/schema changes, Stripe-secret changes, SEO/homepage/email work, or publication.
- Preserve `embedded_page`, server fail-closed validation, canonical route identity, and booking creation only after successful payment/webhook processing.
