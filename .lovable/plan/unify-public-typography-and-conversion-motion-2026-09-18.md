# Unify public typography and conversion motion

## Scope
Polish the active customer-facing website only. Preserve all copy, prices, tour facts, routes, Studio decisions, availability, booking/payment behavior, analytics, SEO, schemas, and database structures. Exclude admin tools, email templates, PDFs, and internal QA screens where browser fonts do not apply.

## Implementation
1. **Typography consistency**
   - Keep Fraunces as the only editorial face for page and section headings plus deliberate italic emphasis.
   - Keep Inter as the only face for body copy, labels, controls, buttons, metadata, counters, and operational text.
   - Replace remaining public micro-labels incorrectly styled with the display face, especially across Travel Designer and shared journey previews.
   - Preserve the existing semantic type scale and responsive sizing rather than introducing new local font rules.

2. **Premium, conversion-focused motion**
   - Keep the homepage Hero’s approved cinematic sequence and calm one-time section reveals.
   - Remove perpetual movement from conversion arrows and ambient CTA decoration; use one-time entrance cues plus hover, focus, and tap feedback instead.
   - Keep ordinary public-page motion within the established micro and editorial timing tiers, with one dominant motion idea per section.
   - Make the final payment handoff immediate rather than smoothly scrolling after commitment, while retaining loading, retry, and double-submit protection.
   - Preserve complete reduced-motion fallbacks so content and actions appear immediately.

3. **Regression protection**
   - Extend the typography and motion checks to prevent display fonts on small UI labels and prevent infinite animation on conversion controls.
   - Keep loading skeleton animation allowed only while content is genuinely loading.

## Validation
- Run the typography, motion, CTA, homepage, Signature, and Studio checkout focused tests plus the motion-budget check and production build.
- Inspect Homepage, Experiences, one Signature detail, Travel Designer, and Studio checkout at 393×852 and 1280×900.
- Confirm Fraunces/Inter rendering, no perpetual CTA movement, clear button feedback, immediate payment transition, reduced-motion behavior, no horizontal overflow, and no page errors.
- Do not publish.