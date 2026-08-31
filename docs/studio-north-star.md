# Studio V3 — Canonical North Star (current, binding)

**Product promise:** *"You are not choosing a tour. You are shaping a day in Portugal."*

This document is the **single canonical current Studio V3 product and
engineering North Star**, matching the live, release-certified implementation.
The source of truth is the current live code plus this document. **All older
planning docs, audits, comparison reports and pass plans are historical only**
and must never be used as current authority.

---

## 1. Conceptual architecture

- **Studio V3 chassis** — the cinematic funnel shell (`src/components/studio-v3/StudioV3.tsx`,
  `PhaseShell.tsx`, `STUDIO_V3_PHASE_ORDER` in `curation.ts`).
- **Living Atlas** — the curation brain: resolves the real Signature hidden
  skeleton/anchor and composes the day from authorized data only.
- **Adaptive deterministic Director (0→N)** — asks only material uncertainties,
  from none to as many as needed; no product hard cap.
- **Living Canvas** — the single persistent visual manifestation of the day
  taking shape before YOUR DAY.
- **Time Authority** — structural dwell + travel/buffer truth.
- **Commercial Truth** — structural commercial identity through to
  server/DB-authoritative pricing and Stripe.
- **YOUR DAY** — the authorship/editor culmination on the frozen committed
  route.

## 2. Canonical experiential flow

```text
Invitation/intro → Feeling → [conditional discovery surfaces as currently
implemented] → Who → Interests → Rhythm → 0..N Director questions
→ YOUR DAY (storyboard) → Make it real / logistics → guestDetails
→ checkoutSummary / payment
```

- **Reward before admin:** the traveller always reaches YOUR DAY before any
  administrative step (date, pickup, party, guest details). Admin exists only
  to make the day real — never as a gate in front of desire.
- Legacy phase ids (`destination`, `date`, `pickup`, `guests`, `investment`,
  `occasion`, `considerations`, `language`, and retired discovery ids) may
  remain in `STUDIO_V3_PHASE_ORDER` for **hydration of saved states and deep
  links only**. They are not product authority and are never asked.
- The visible progress model is honest: `FEEL → TASTE → SHAPE → YOUR DAY`,
  mapped 1:1 onto real phase groups.

## 3. Director (adaptive questions)

- True **0→N**: asks only material uncertainties; terminates when nothing
  material remains. No fixed question count and no product hard cap.
- **Deterministic semantics and options**: closed option catalog, explicit
  uncertainty detectors, cycle protection, sequential causal state
  re-derivation each step. Reachability for all 12 Signature directions is
  certified by sequential simulation.
- **AI is wording/voice only**, where currently allowed; it never decides
  what is asked, never invents stops or facts, and has a deterministic
  fallback.
- **Explicit exclusions win**: traveller negations (including free-text
  interpreter exclusions) can never be overridden by AI or inference.
- Semantic profile is a **derived projection** of canonical inputs and
  question history — never a second persisted truth, with no silent loss in
  top-N projections (boundary honesty).

## 4. Living Atlas (curation)

- Every direction resolves to a **real Signature tour as hidden
  skeleton/anchor**.
- Hybrid composition is authorized **same-region / same-corridor only**.
  **No geographic cluster mixing.**
- Capability intent is explicit: e.g. an Arrábida anchor does not imply wine
  intent. Intent must come from traveller signals, not geography.
- **No invention, ever.** Stops, partners, inclusions, prices, drive times and
  itineraries come from real project data. AI is voice only.

## 5. Living Canvas (pre-YOUR-DAY manifestation)

- The **only** persistent visual manifestation of the day before YOUR DAY.
- **At most one** `data-testid="studio-living-canvas"` mounted on any phase
  path; it lives in normal document flow directly under the active decision —
  no sticky/fixed positioning, no side-by-side squeeze on mobile.
- Present through the meaningful shaping sequence (feeling, conditional
  discovery surfaces, who, occasion, interests, rhythm, each Director
  question) and in logistics; **storyboard uses the assembled treatment
  only**; guestDetails/checkoutSummary have no discovery Canvas.
- Media is **real/verified** via the media resolver with graceful truthful
  fallback; missing image or coordinates never blocks progression and never
  fabricates geography.
- **Retired from the current path:** `LivingJourneyPanel` (journey-draft
  pill/drawer with its Story/Timeline/Map tabs and its server AI story call)
  and `ComposerMap` as parallel pre-reveal surfaces. Their modules may remain
  for legacy paths; they must never mount in the modern flow.

## 6. YOUR DAY (authorship culmination)

- The route is **frozen (committed snapshot) before logistics**; going back
  and changing a shaping answer clears the snapshot only where canonical
  rules require and lets the day re-shape.
- **Keep / Swap / Remove / Add / Reorder / Undo** all preserve structural
  identity, media/focal, coordinates and duration truth.
- Authored edits and commercial identity remain aligned at all times.
- Candidate fit is validated per candidate (time admission, regional
  coherence, cumulative add-on time budget); nothing is silently shortened
  or removed.

## 7. Time Authority

- **Authoritative structural dwell + travel/buffer truth** when evaluable
  from structural stop identities (`timeAuthority.ts` over canonical V3
  timing).
- Legacy heuristic timing is an **explicit fallback only** when structural
  minute truth is absent — legacy routes without structural identity are
  non-evaluable, never guessed.
- **No silent shortening or removal** of stops to make times fit.

## 8. Commercial Truth

- Chain of authority: **Inventory/Blueprint ID → Route Point → Commercial
  Identity → Approved Pricing Action → server/DB pricing**.
- Exact party tiers are **DB-authoritative and fail closed**; missing tier
  means no exact price, never a guess.
- Before party confirmation, no exact price is presented as confirmed.
- The current edited/frozen route is the checkout commercial authority;
  unresolved identity cannot be charged as a guessed product.
- **Stripe/server is the final authority**: checkout totals use canonical
  `perUnitEur × quantity`; UI add-on amounts and server quantity/total parity
  are maintained; the commercial ledger is deduplicated.
- Operational approval is fail-closed: only a real `approved` status enables
  Reserve; `review` never proceeds as if approved.

## 9. Operational & privacy rules

- Minimum lead time **3 days**.
- Mercado experiences: **morning only, closed Mondays**.
- **No supplier winery names** on any public Studio surface.
- **No exact public times** presented to travellers.
- Unresolved combinations **fail closed** to review/curator — never silently
  mutate route membership.

## 10. Approved commercial rules (locked)

The commercial rules currently encoded in the live implementation — including
removal rules, add-lunch rules and winery rules — are **owner-approved and
must be preserved**. They must not be reinterpreted, relaxed or "corrected"
from older documents. Any change requires an explicit owner decision.

## 11. Design contracts (unchanged)

- Brand palette tokens, Fraunces + Inter two-family typography, sentence
  case, gold as micro-detail.
- **Mobile-first at 393px**: no horizontal overflow, normal-flow Canvas,
  CTA/question primary, ≥44px touch targets, visible focus.
- Motion is subtle and reduced-motion safe; content never depends on
  animation to appear.
- Supplier-name privacy preserved in all media/copy surfaces.

## 12. Certification status

- **Experience Unification complete**: Living Canvas is the single
  pre-YOUR-DAY manifestation; retired panels/maps do not mount.
- **Release certification**: full Studio V3 unit suite green at certification
  (1458 tests / 147 files at unification; targeted release-certification
  suite green), 393px mobile contract certified, typecheck clean.
- Protected baseline: `src/integrations/supabase/types.ts` with
  `PostgrestVersion: "14.17"`, plus `.lovable/mcp/manifest.json` and
  `src/generated/brand-audit.json` — never modified by feature work.
- Legacy e2e specs that assert the retired flow are **stale** and must not be
  trusted until rewritten.

## 13. For future agents

1. Read the live code and this document. Ignore superseded planning docs for
   current authority (they carry a SUPERSEDED banner).
2. Do not resurrect retired surfaces (LivingJourneyPanel, ComposerMap,
   journey-draft drawer, refinement caps, hard question caps, heuristic-first
   timing).
3. Any change to flow, Director semantics, Atlas composition, Time Authority
   or Commercial Truth requires an explicit owner instruction — and an update
   to this document in the same change.
