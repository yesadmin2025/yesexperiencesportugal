# Release-candidate premium polish

## Scope and safeguards
Polish the current public presentation without changing routes, metadata, structured data, prices, tour facts, inclusions, booking rules, payment accounts, database schemas, or production data. No deployment.

## Implementation
1. **Cinematic homepage Hero**
   - Make the mobile film fill the usable viewport below the fixed header, with safe-area-aware spacing and a lighter bottom handoff so the video remains visible.
   - Extend the existing reveal into a calm 4–5 second sequence: eyebrow, first line, second line, Fraunces upright support copy, primary action, secondary action.
   - Keep both actions available immediately in the document, restore the premium teal/ivory/gold and dark-glass CTA treatments, and use only opacity, small vertical movement, and restrained blur.
   - Preserve the exact locked headline, CTA vocabulary, film assets, accessibility contrast, and immediate reduced-motion state.

2. **Homepage and shared editorial motion**
   - Reuse the existing motion controller and semantic duration/easing tokens for section, image, card, and CTA reveals.
   - Apply motion selectively to the homepage’s major editorial sections and align visible title styling on Homepage, Experiences, Studio V3, and Travel Designer through existing typography primitives rather than rewriting content.
   - Keep mobile free of parallax and ensure reduced motion removes ornamental effects.

3. **Experiences discovery**
   - Keep the two-column desktop / one-column mobile editorial grid, real imagery, tour data, and detail links.
   - Remove collection-only reviews, “Private”, lunch/inclusion labels, and other duplicate signals; retain region/theme, title, one teaser, duration, from-price, and one “View experience” action.
   - Normalize card rhythm, image proportions, content height, tap targets, and restrained hover/reveal behavior.

4. **Representative Signature booking choice**
   - Simplify the Arrábida page’s initial decision hierarchy without removing information: one dominant reserve action with essential price/date/guest context first; tailoring, preferences, trust, and explanations remain available as quieter or progressively disclosed supporting choices.
   - Reuse the existing booking form’s disclosure and checkout components; preserve pricing resolution, availability, guest rules, payloads, and checkout behavior exactly.

5. **Operational P0 verification and surgical gaps only**
   - Verify the existing canonical-host Stripe environment lock, canonical live return URLs, shared in-flight checkout guard, sanitized URL logging, analytics exclusions, and environment/traffic tagging across all call sites.
   - Change these areas only if the audit identifies a concrete bypass or missing checkout surface. Add host × key/environment and double-submit/privacy regression coverage without touching live payment data or historical rows.

## Technical details
- Primary files expected: `src/components/home/CinematicHero.tsx`, `src/routes/experiences.tsx`, `src/routes/tours.$tourId.tsx`, `src/components/SimpleBookingForm.tsx`, `src/styles.css`, and directly affected focused tests.
- Payment/privacy files remain unchanged unless a verified gap exists: `src/lib/payments-environment.ts`, `supabase/functions/_shared/payments-environment.ts`, `src/lib/checkout/session-request.ts`, `src/lib/url-sanitize.ts`, `src/lib/analytics-exclusions.ts`, pageview/error logging modules, and checkout function callers.
- Update `roadmap.md` with this release-candidate task and close it after validation.

## Validation
- Focused Hero CTA, typography, choreography, and reduced-motion tests.
- Experiences collection and representative Signature booking tests.
- Payment host/environment matrix, return-origin, checkout deduplication, analytics exclusion, and URL privacy tests.
- Mobile browser smoke checks at approximately 393px for Homepage, Experiences, Arrábida booking flow, Studio entry, and embedded Stripe opening in test mode only.
- Verify no horizontal overflow, duplicate H1s, broken touched links, accidental price/text drift, or reduced-motion regressions.
- Run TypeScript checks and production build; report unrelated failures separately.
