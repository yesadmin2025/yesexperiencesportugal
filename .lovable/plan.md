# Studio truthfulness check: "I pick cheese, I get cheese, and I can book it"

Goal: prove — on the current code, in a real browser run — that a concrete Studio choice
produces exactly that experience in Your Day, keeps it truthful all the way to payment, and
that Reserve is actually enabled. Fix only what the run proves is broken.

## What is already in place (verified by reading the code)

- Concrete Director answers create exact structural obligations: `make-azeitao-cheese` maps to
  the real cheese workshop stop, `paint-azulejo` to the real tile studio.
- Those obligations are passed into composition and into the high-signal conflict check, so the
  composer is told which stop must appear, not just a broad "workshop" category.
- Deterministic day repair and the final time/commercial gates already decide whether Reserve
  can be pressed.

What has **not** been re-verified since the last changes is the end-to-end behaviour in a live
browser: that is what this pass does.

## Pass 1 — Evidence run (no code changes yet)

1. Focused test suites: exact Director obligations, high-signal conflict, semantic selection,
   composition core, checkout gate.
2. Live 393px mobile run on the preview:
   - preflight with a valid future date, Lisbon pickup, 2 adults
   - choose a hands-on / food-and-craft path and pick **cheese** explicitly
   - capture the composed Your Day stop list
3. Assertions for that run:
   - the cheese workshop appears in Your Day; no tile-painting or generic "workshop" substitute
   - every other revealed moment traces to a real inventory stop
   - Your Day, Guest Details and Summary all show the same stops, date, pickup and party
   - `Make it real` and the Summary Reserve control are enabled (day certified)
   - Reserve returns HTTP 200 with a client secret and Stripe Embedded Checkout mounts
   - no payment is made
4. Repeat the same run for the tile-painting choice, to prove the two do not swap.

## Pass 2 — Fix only proven gaps

Whatever the run shows as broken gets the smallest possible fix, in this order of priority:

1. **Wrong experience** — the chosen concrete option is missing or substituted: repair the path
   that drops it (obligation propagation into composition/repair), never by hardcoding output.
2. **Truth drift** — Your Day and Summary disagree: make the later screens read the same
   authoritative route the reveal used.
3. **Cannot book** — Reserve blocked on a day that is genuinely feasible: identify the exact
   failing gate and correct that gate only.

If a chosen combination is genuinely not operable, Studio must say so inside Studio with a clear
adjustment, never route to a curator or a lead form.

## Explicitly out of scope

Pricing rules and amounts, tier data, rhythm, Stripe secrets and `ui_mode` (stays
`embedded_page`), DB schema, emails, SEO, homepage, admin. No redesign of Studio. No publish and
no real payment in this pass.

## Technical notes

- Files most likely to change if a gap is found: `src/lib/studio-v3/exactDirectorObligations.ts`,
  `src/components/studio-v3/curation.ts`, `src/components/studio-v3/highSignalConflict.ts`,
  `src/lib/studio-v3/dayRepair.ts`, `src/components/studio-v3/StudioV3.tsx`.
- Protected files stay untouched: `src/generated/brand-audit.json`;
  `src/integrations/supabase/types.ts` remains at `PostgrestVersion: "14.17"`.
- Validation after any edit: `bunx tsgo --noEmit` plus the focused Studio suites, then a repeat
  393px smoke.
- Deliverable: a short report naming, per choice, the composed stops, whether Reserve was
  enabled, the checkout HTTP status, and any fix applied.
