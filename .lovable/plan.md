## Framing

This is a **QA + safe-fix pass**, not a feature build. Scope is huge (Signature + Tailor + Studio + checkout across 7 breakpoints, plus animation/mobile/visual polish, plus a full test matrix and release-gate report). One turn cannot honestly cover it. I'm proposing a **two-phase plan** so you can steer between them.

Also important — from project memory: the site is in **TEST MODE**. There is no live Stripe charge in the current flow; the Studio "checkout" (`/checkout/$token`) is a draft-confirm form, and Signature/Tailor "Reserve instantly" writes a booking without capturing payment. That reshapes what "checkout validation" can actually verify today (see Constraints below).

Switch to live mode stripe 

---

## What I already know from recon

- **Pricing single source of truth exists**: `src/data/signatureTourPricing.ts` → `resolveJourneyPricing(tour, adults, minorAges, overrides)`. Owner-approved age bands: adult 100% / youth 11–17 75% / child 3–10 50% / infant 0–2 free. Returns `null` when a minor age is out of band (server must reject) — good.
- **Traveller composition model exists**: `src/lib/checkout/composition.ts` — `{adults, minorAges}`, `isCompositionComplete`, `formatCompositionSummary`, `hydrateLegacyComposition`.
- **Studio V3** has `useResolvedJourney`, `Composition`, `SignaturePriceCard`; parity tests already live under `src/components/studio-v3/__tests__/`.
- **Signature + Tailor** consume the same pricing engine (imports in `SimpleBookingForm.tsx`, `tours.$tourId.tailor.tsx`).
- **Known gap**: `src/routes/checkout.$token.tsx` still uses a bare `guests: number` input — it does not carry `minorAges` from Studio through the Studio-V2 draft-confirm form. Composition can be lost at that boundary.

---

## Phase 1 — Audit & report (this task, single turn)

Produce the **§20 Final Report** as a real audit document, findings-first, no code changes yet. Deliverable: `docs/pre-launch-qa-report.md` plus the audit surface files that back each finding.

Steps I will execute:

1. **Map the three flows** (Signature / Tailor / Studio) end-to-end with file references — entry routes, composition steps, pricing hook, summary, CTA target, "checkout" surface, confirmation.
2. **Verify the pricing single source of truth** by importing every price display in the codebase and diffing it against `resolveJourneyPricing`. Any component computing its own subtotal, adult-only per-pax display, or hardcoded child rule → flagged CRITICAL.
3. **Composition persistence trace** — cold-navigation reproductions with Playwright at 390px:
  - Signature (2 adults) → detail → reserve → summary
  - Signature + 1 child aged 8 → same path
  - Signature + kids of mixed ages (7, 12, 3) → same path
  - Tailor: remove one optional stop, add one add-on, add one winery
  - Studio: adult couple / family with children / add-on / stop replacement
  - Back nav after pricing change; browser refresh where supported
4. **Per-person display audit** — every `€ / guest`, `€ per person`, `average` string. Confirm mixed-age screens either hide per-person, label it "Average per guest", or split adult/child rows (§5 rule).
5. **Checkout validation** (given TEST MODE):
  - `/checkout/$token` (Studio V2 draft) — composition, itinerary, total consistency, mobile fit at 390 / 430 / 768.
  - Signature "Reserve instantly" flow — composition round-trip, correct product type in booking payload, `booking_confirmed` state.
  - Explicitly log which checks are **N/A until live payments** (Stripe metadata, server-authoritative amount vs client, payment failure/retry).
6. **Responsive sweep** at 375 / 390 / 430 / 768 / 1024 / 1280 / 1440 via Playwright element screenshots on: Signature listing, Signature detail, Tailor, Studio composition, Studio map, Studio Refine, Studio Story, Studio final reveal, `/checkout/$token`, `/booking-confirmed`.
7. **Animation QA** — read `home-motion.ts` + `data-motion` usages on Signature/Tailor/Studio; check `prefers-reduced-motion` guards; note any observer-hidden content, replays, or transform-clipping.
8. **Frontend hygiene** — captured console/network from each reproduction: React warnings, missing keys, hydration mismatches, failed asset requests, 401/500 to server fns.
9. **CTA/nav sweep** — enumerate the CTAs in §13 and confirm destinations by static grep + one click in Playwright per CTA class.
10. **Test matrix (§18)** — filled table with pass/fail per scenario, evidence links (screenshot paths, file:line, network trace).
11. **Release gate** — verdict per §19, blockers listed with severity (CRITICAL/HIGH/MEDIUM/LOW). Expected: NOT READY, because §7 Stripe checks are structurally impossible in TEST MODE and I expect at least the `checkout.$token` composition gap plus a handful of responsive/motion issues.

### What Phase 1 explicitly does NOT do

- No source edits, no copy changes, no schema changes.
- No new features, no redesigns.
- No SEO work.

---

## Phase 2 — Safe fixes (only after you approve the report)

You review the findings, mark CRITICAL/HIGH ones "fix", MEDIUM/LOW "defer or fix". I then execute in a single follow-up:

- Pipe composition (`adults + minorAges`) all the way to `/checkout/$token` and its confirm handler so Studio bookings never lose child data.
- Any per-person display that violates §5 gets corrected (label "Average per guest", split rows, or hide — chosen per surface).
- Any component that recomputes price locally is refactored to call `resolveJourneyPricing`.
- Broken CTAs, wrong destinations, dead buttons.
- Responsive regressions at the tested breakpoints (grid/min-w-0/shrink-0 fixes per responsive-layout-patterns).
- Motion issues (missing reduced-motion guard, observer replays, transform overflow).
- Console/network cleanups where the fix is local (missing keys, warned nesting, listener leaks).

Every fix ships with a targeted verification (Playwright screenshot or vitest run) before I claim it green. Nothing bundles unrelated work.

---

## Constraints & honesty notes (§7, §17)

- **Live Stripe checkout is not wired** (TEST MODE per project memory). §7 items "correct Stripe metadata / correct payment amount / server-authoritative quote / payment failure & retry" cannot pass today because there is no live payment layer to test against. The report will flag them as **BLOCKED by TEST MODE**, not "PASS" or "FAIL". Enabling live payments is a separate task and requires your go-ahead (built-in `enable_stripe_payments`).
- **No invented pricing**: if a Signature is missing a real Viator tier for a group size, the report calls it out — I will not backfill numbers.
- **No copy rewrites** unless a CTA string or product name is factually wrong.
- **No SEO / canonical / sitemap / metadata changes** in either phase.

---

## Deliverables of Phase 1 (this turn)

1. `docs/pre-launch-qa-report.md` — the §20 report, with each finding sourced to a file:line or screenshot path.
2. Screenshot evidence under `/tmp/browser/qa/` (not committed).
3. A short chat summary listing **CRITICAL / HIGH blockers only** and the release-gate verdict.

Approve this plan to run Phase 1. I'll return with the report and wait for your call on which fixes to ship in Phase 2.