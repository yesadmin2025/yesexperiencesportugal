# Restore the premium editorial visual system

## Scope
Restore visual richness on the current revision without reverting or changing routes, metadata, structured data, content facts, pricing, availability, Studio logic, checkout/payment safeguards, analytics/privacy work, database behavior, or production data. Do not deploy.

## Implementation
1. **Hero and shared actions**
   - Keep the road film, current copy meaning, viewport composition, image-loading fixes, and sequential choreography.
   - Restyle the support line as an upright Fraunces champagne subheading with stronger contrast and a softer editorial shadow.
   - Replace teal Hero blocks with a smoked-charcoal, warm-gold keyline system: tactile primary, quieter glass/hairline secondary, gold arrows, one-pass sheen, 1px lift, accessible focus, and immediate reduced-motion state.
   - Update shared public `CtaButton` variants to the same charcoal/gold/ivory grammar while preserving loading, disabled, error, handlers, labels, and checkout-specific utility behavior.

2. **Editorial typography and continuity**
   - Return `SectionTitle` to Fraunces medium by default and retain the canonical italic teal emphasis helper.
   - Normalize major public H1/H2 moments on Homepage, Experiences, Travel Designer, Signature detail, Moments/Proposal, and Corporate where existing copy supports a meaningful upright-plus-italic composition.
   - Keep cards, operational labels, body copy, forms, Studio controls, and checkout in Inter or their existing functional hierarchy.
   - Reuse the current motion controller for authored staggered title/copy, image, and card arrivals, with one motion idea per section and full reduced-motion coverage.

3. **Experiences collection**
   - Consolidate the opening into one clear editorial introduction and remove the redundant collection heading.
   - Preserve one mobile/two desktop columns and truthful image/data links, but increase whitespace and use image/type/hairline composition rather than bordered cards.
   - Limit every card to image, region/theme, title, short clamped teaser, duration, from-price, and one quiet gold-hairline “View experience” action.
   - Reduce the Studio ending to an unboxed editorial escape hatch that remains visually secondary.

4. **Cross-surface coherence**
   - Carry charcoal authority, teal editorial emphasis, gold micro-detail, and ivory/sand canvas through the requested public surfaces.
   - Keep Signature booking hierarchy and all Studio/checkout functionality intact; only shared presentation classes may change there.
   - Preserve all current content, facts, CTA vocabulary, destinations, prices, and business behavior.

## Technical details
- Primary files: `src/components/home/CinematicHero.tsx`, `src/components/ui/SectionTitle.tsx`, `src/components/ui/CtaButton.tsx`, `src/routes/experiences.tsx`, selected homepage/public heading consumers, and `src/styles.css`.
- Update only directly affected visual-contract tests and snapshots.
- Historical commits are design references only; no wholesale reverts or functional-file restoration.

## Validation
- Run focused Hero, typography, CTA, Experiences, motion, and reduced-motion tests plus TypeScript and a fresh production build.
- Visually inspect Homepage through at least three post-Hero sections, Experiences, Arrábida detail, Studio entry, and Travel Designer at 393×852 and 1280×900.
- Confirm one H1, no horizontal overflow, no hidden actions, immediate reduced-motion content, no price/fact drift, and intact booking controls.
- Report the resulting revision, changed files, exact checks, concise before/after summary, and any blocker. Do not publish.
