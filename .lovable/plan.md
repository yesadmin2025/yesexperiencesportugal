# Plan — Full StudioV3 booking-flow E2E audit

## Goal
Prove the entire Studio V3 journey (cinematic intro → 15 decision phases → map awakens → storyboard/reveal → guest details → checkout summary → Stripe redirect handoff) renders, validates, advances, and converts without friction on the mobile viewport the user actually uses (393×588, dpr 3).

This is a **read-only diagnostic pass**, not a code change. The output is a written verdict + screenshot evidence + a prioritized friction list. Any fixes are proposed in a follow-up plan.

## What I'll run

Single Playwright script under `/tmp/browser/studio-v3-e2e/` that:

1. Boots at `http://localhost:8080/studio-v3` at **393×588**, waits for `__APP_READY__`.
2. Installs telemetry capture for `studio-v3:*` events (curation.decision, phase4.timing, reveal.validation, builder.step, reveal.premium) — same shape as `e2e/studio-v3-reveal-walkthrough.spec.ts`.
3. Walks every phase using the existing `data-phase-cta` convention (single-select, multi-select, calendar bypass, tier picker). Dismisses reaction overlays.
4. At **each phase transition**, records:
   - `data-phase` value + phase label seen by user
   - Time-to-interactive (ms since previous CTA click)
   - Screenshot: `NN_<phase>.png`
   - Console errors / warnings (esp. the `nonPerPerson` add-on guard from P2 #15, and the hydration mismatch already in logs)
   - Any horizontal overflow (scrollWidth > clientWidth) at 393px
   - Any element with `aria-disabled` or non-interactive Continue when a selection exists
5. Handles the MapAwakens auto-advance (Next moment stepper + hold-journey gate) exactly like the reference spec.
6. On the reveal, asserts:
   - `[data-testid="studio-v3-reveal"]` visible ≤ 2500ms (P0 spec)
   - Real `€\d{2,}` price present
   - `reveal.validation` event fires with `ok:true` + resolved `tourId`
   - `studio-v3.audit.buffer.v1` in localStorage contains the same payload
   - Signature story chapters + inclusions come from real tour data (via `buildSignatureStorySnapshot`), no placeholders
7. Continues into **Guest Details** — fills valid dummy data, asserts email trigger fires (checks Signature Story snapshot freeze at blur time), and advances to **Checkout Summary**.
8. On checkout summary, asserts:
   - Per-guest price × guests + add-ons party total = displayed total (unit-aware, per P2 #15 `partyAmountFor`)
   - No `nonPerPerson` console warning
   - Stripe publishable key loaded (`getStripe()` resolves) and `create-signature-checkout` edge function returns a session URL
   - Does NOT complete Stripe payment (sandbox redirect is the terminal step for this audit) — captures the redirect URL as proof of handoff
9. Runs a second pass with **occasion + considerations** selected to exercise the P2 #13 beat-order fix (`occasion` now Beat 2) and confirms the stepper never goes backwards.
10. Runs a third minimal pass with `prefers-reduced-motion: reduce` to confirm reveal still lands ≤ 2500ms and no motion-gated CTA is stuck.

## Deliverable format

A single report I post back in chat:

```
Phase-by-phase table
────────────────────
#  phase              TTI(ms)  overflow  console  screenshot
1  intro              412      ok        clean    01_intro.png
...
17 checkoutSummary    884      ok        clean    17_checkout.png

Reveal contract       PASS (2180ms, tour=<id>, €<n>)
Price parity          PASS (perPax×g + addOns = total)
Beat order (P2 #13)   PASS (Feel → Shape → Rhythm → Reveal, monotonic)
Stripe handoff        PASS (session URL captured)
Reduced motion        PASS

Friction findings (prioritized)
1. [severity] <what> — <where> — <suggested fix>
2. ...
```

## Scope guardrails

- **No code edits.** If I find bugs, they go in the friction list for a follow-up plan.
- **No live Stripe charge.** Terminal step is the redirect URL from the edge function.
- **Mobile-first viewport** (393×588) per the user's core rule; a single desktop pass (1280×1800) only if a mobile finding needs to be confirmed as viewport-specific.
- Uses only the dev server already running on :8080. No restarts, no installs.

## Technical notes

- Reuses the walker heuristic from `e2e/studio-v3-reveal-walkthrough.spec.ts` (prefer enabled Continue when a selection exists, else first unselected `[data-phase-cta]`).
- Telemetry ring buffer key: `studio-v3.audit.buffer.v1`.
- Signature snapshot source: `src/components/studio-v3/signatureStorySnapshot.ts` (chapters + inclusions must trace to real `signatureTours` data — no invention).
- Add-on math source: `partyAmountFor` in `StudioV3.tsx` ~L809; `nonPerPerson` warning must NOT fire with the current catalog.
- Checkout edge function: `supabase/functions/create-signature-checkout`.
- Auth: not required for `/studio-v3` — public route, no bearer.

## Out of scope

- Fixing anything found (separate plan).
- Desktop/tablet visual regression (covered by existing workflows).
- Real payment completion or webhook validation.

Approve this and I'll switch to build mode, run the script, and post the report + screenshots.