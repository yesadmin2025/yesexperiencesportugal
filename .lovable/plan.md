# Studio V3 — Full End-to-End Audit

Goal: walk the Studio from `/studio-v3` intro all the way through map → curation → storyboard → refine → storytelling → guest details, and produce a single consolidated audit report covering copy, typography, structure, logic, palette, CTAs, price logic, and clarity. No code changes in this pass — findings only, grouped by severity, each with file:line references and a proposed fix. A follow-up plan will implement the fixes you approve.

## How the audit runs

1. **Live mobile walkthrough (393×588, the user's viewport)** via Playwright against `http://localhost:8080/studio-v3`:
   - Screenshot every phase (intro, feeling, who, rhythm, region, arrival, tier, date, map/moments, storyboard, refine, storytelling, guest details).
   - Capture console warnings (esp. `[font-fallback]`), network errors, and telemetry events (`curation.decision`, `reveal.validation`, `builder.step`).
   - Exercise both a "minimal" path (fewest add-ons) and a "rich" path (Arrábida + multiple add-ons) so price logic is stressed.
2. **Static audit** of the Studio V3 source (`src/components/studio-v3/**`, `src/content/signature-day-copy.ts`, `src/data/signatureAddOns.ts`, `src/data/signatureTourPricing.ts`, `src/hooks/useStudioState.ts`) for the categories below.
3. **Cross-reference** live findings against the Studio north-star memory (`mem://design/studio-philosophy`), brand guardrails, typography v3, and the "no invented stops" constraint.

## Audit dimensions

Each finding is tagged `[BLOCKER | HIGH | MEDIUM | LOW]` with file:line + suggested fix.

- **Copy** — sentence case, no invented facts, no competitor claims, tone consistent across phases, microcopy on CTAs matches destination screen, error/empty states, no leftover placeholder strings.
- **Typography** — only Fraunces (headings + italic emphasis) and Inter (body/UI); no Montserrat/Georgia/Cormorant regressions; correct sizes on mobile; italic emphasis restricted to headings; runtime `[font-fallback]` warnings surface here.
- **Structure** — phase order matches the philosophy (feeling → who → rhythm → region → arrival → tier → date → map → storyboard → refine → storytelling → guest details); no dead phases; back/forward preserves state; deep-link/refresh behaviour.
- **Logic** — selections persist across phases; tier + region + rhythm gates work; add-on availability (minStops, region compatibility) is correct; guest count math; date "flexible" bypass; refine ↔ storytelling round-trip preserves toggles.
- **Color palette** — only the 8 brand tokens; no hardcoded hex/`text-white`/`bg-black`; gold used as micro-detail only; contrast ≥ 4.5:1 on --charcoal and --ivory surfaces.
- **CTAs** — every actionable card has `data-phase-cta`; primary/ghost variants use `<CtaButton>`; labels match the destination ("See my signature story", "Continue to guest details", "Save my signature", "← Back to refine"); 44×44 tap targets; visible focus ring; disabled reasons are explained inline.
- **Price logic** — per-guest base × guests + add-ons × guests; `studio-v3-add-ons-total` and `studio-v3-party-total` agree; add-ons that are disabled never contribute; currency formatting (€, no decimals); tier upgrade updates totals in the same frame; storytelling → refine → storytelling preserves the total.
- **Clarity** — every screen answers "what am I choosing / what happens next / how much"; no jargon; empty and edge states (no add-ons, single guest, minimum tier) read naturally; a11y labels match visible text.

## Deliverable

A single audit report written to `.lovable/studio-v3-audit.md` with:

- Table of contents by phase.
- Screenshot thumbnails per phase (saved under `/tmp/browser/studio-v3-audit/`).
- Findings grouped by severity, each with: phase, category, file:line, evidence (screenshot or quoted code), proposed fix, effort estimate (S/M/L).
- A short "green list" of things that are already correct, so we don't regress them later.
- A prioritized fix backlog ready to be converted into an implementation plan.

## Out of scope for this pass

- No source edits, no snapshot updates, no CI changes.
- No changes to pricing data, add-on catalog, or tour content.
- Desktop/tablet audit — mobile 393×588 only (matches your working viewport). Desktop can be a follow-up.

## Next step after you approve

I run the walkthrough + static audit, publish `.lovable/studio-v3-audit.md`, and then propose a second plan that implements the BLOCKER/HIGH fixes in priority order.
