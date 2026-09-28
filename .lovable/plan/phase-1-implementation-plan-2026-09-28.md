# Phase 1 implementation plan

## Outcome
Improve trust consistency, booking clarity, perceived speed, measurement, and technical SEO without changing pricing, transactions, tour facts, Studio logic, routes, brand composition, typography, palette, or approved motion.

## Work
1. Centralize approved public review proof and replace stale public counts.
2. Add quiet USD estimate messaging beside currency controls.
3. Strengthen verified reassurance and mobile booking access on tour pages.
4. Stabilize `/experiences` loading and card media without changing its order or layout.
5. Apply safe image/widget loading improvements.
6. Consolidate typed analytics events and wire non-PII actions.
7. Correct only verified robots, sitemap, canonical, hreflang, metadata, Open Graph, and schema defects.
8. Replace only the prohibited Press Kit backlink paragraph if present.
9. Verify the requested English and Portuguese pages at 393px and desktop, then inspect diagnostics.

## Constraints
- Preview only; no production deployment.
- No database, payment, booking, pricing, route, or keyword-strategy changes.
- No AggregateRating or Review schema.
- Existing Premium, Conversion, Motion, and Visual Hierarchy locks remain authoritative.

## Technical approach
- Reuse existing public primitives and semantic tokens.
- Prefer stable reserved layouts and native image loading hints over new dependencies.
- Keep GTM/dataLayer compatibility behind one typed event helper.
- Make leaf metadata self-referential and language alternates symmetric only where equivalent pages already exist.
