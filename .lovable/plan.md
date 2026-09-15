# Premium System Lock hardening

## Goal
Unify the active public website around the existing YES premium system without redesigning pages or changing routes, content strategy, product facts, pricing, booking rules, Studio composition, or payment behavior.

## Implementation
1. **Canonical typography**
   - Normalize the global semantic scale for Display XL, Display, H1, H2, H3, Body Large, Body, Small, Eyebrow, and Button using Fraunces and Inter only.
   - Align the existing `SectionTitle`, `Eyebrow`, and `CtaButton` primitives to those tokens.
   - Replace practical local type declarations on Home, Experiences, Studio V3, Travel Designer, Moments, Corporate, active tour details, consent, and checkout surfaces while preserving each page’s hierarchy and homepage H2 weight exception.
   - Remove active public references to retired font families; leave admin and genuinely legacy-only surfaces untouched.

2. **CTA vocabulary and purchase hierarchy**
   - Introduce a small canonical CTA-label source and use it on the active public surfaces.
   - Standardize Studio, Signature discovery/booking, Tailor/refine, Travel Designer, Moments, Corporate, and final Studio reveal labels without changing destinations or handlers.
   - Keep the homepage Hero intact and make the existing path section visually prioritize Studio, Signature Experiences, and Travel Designer; Moments and Corporate remain quieter secondary paths.

3. **Motion grammar**
   - Retune shared duration tokens to micro 140–200ms, interface/editorial 300–450ms, and cinematic 700–1000ms.
   - Preserve the cinematic Hero while removing general 1.5-second defaults and decorative idle movement from ordinary/transactional surfaces.
   - Keep one restrained reveal idea per ordinary section and preserve all reduced-motion behavior.

4. **Studio flow language**
   - Map the existing Studio phases into three visible chapters: YOU, YOUR DAY, and MAKE IT YOURS.
   - Update progress labels/grouping only; preserve phase order, captured state, eligibility, composition, pricing, and checkout handoff.

5. **Consent and checkout polish**
   - Refine the existing consent presentation into a lower desktop utility bar and compact mobile bottom sheet while preserving every choice, focus behavior, and 44px targets.
   - Reuse current checkout locking/loading infrastructure; ensure active Signature, Tailor, and Studio entry points disable repeat submission, show immediate quiet progress, translate failures into human copy, and expose a retry path while keeping date, guests, price, inclusions, and trust visible.

6. **Guardrails and documentation**
   - Add `docs/premium-system-lock.md` covering typography, CTA vocabulary, motion tiers, flow grammar, and checkout rules.
   - Strengthen focused regression coverage for the two-font contract, CTA vocabulary, motion tiers, reduced motion, checkout states, and 393px primary-action/overflow behavior.

## Technical scope
- Primary files: `src/styles.css`, shared UI primitives, homepage path/CTA surfaces, the named public route components, Studio progress/chrome, consent, and checkout presentation/state components.
- Tests will extend existing Vitest and Playwright contracts rather than introduce new packages or broad suites.
- Any noncanonical wording inside long-form editorial/SEO prose remains untouched unless it is an actual conversion control.

## Verification
- Typecheck and production build.
- Focused typography, CTA vocabulary, motion/reduced-motion, consent, Studio, and checkout tests.
- Browser verification at 393px and one desktop viewport for Home, Studio, a Signature detail, Travel Designer, Moments, Corporate, and checkout states; confirm no horizontal overflow or hidden primary actions.
- No production deployment or database changes.
