# YES Experiences Portugal — Public editorial design contract

Approved mobile direction (27 November 2026). Preserve the brand, storytelling, real photography, prices, booking logic and SEO while maintaining a restrained editorial hierarchy.

## Typography and layout
- Fraunces: cinematic hero, editorial chapter titles and main product-card titles. Inter: body, navigation, labels, prices, FAQ and controls.
- Editorial signature: preserve the contrast between upright Fraunces in charcoal and selective italic Fraunces in brand teal. Use `SectionTitle.Em` for the emotional or evocative half of an editorial heading; keep both parts in the same type scale and optical size, with natural wrapping and balanced line lengths. Do not flatten existing mixed-emphasis titles, italicize functional UI or mechanically add italics to factual titles. Preserve intentional exceptions and the cinematic hero copy.
- Mobile public editorial chapter title: 30px; Signature product-card title: 20px; introductory supporting copy: 15px with 1.65 line-height; eyebrows: 11px.
- Mobile chapter rhythm: 64px section padding; label to title 16px, title to supporting copy 16px, introduction to content 32px. Do not stack nested section padding. Long headings and paragraphs must wrap naturally, never clip to achieve a line-count target.
- FAQ questions: Inter 15.5px medium; YES Difference pillar labels: Inter 15px semibold.
- Mobile primary marketing actions: 48px minimum, 12px Inter, 0.18em tracking; permit natural expansion for text wrapping, localization and accessibility. Maintain visible focus and adequate touch targets. Secondary actions use restrained hairlines or chips.
- Keep the existing desktop editorial scale and layout. Do not shrink text to fit a fixed height.

## Scope and visual language
- Reuse SectionTitle, Eyebrow, CtaButton and shared editorial CSS tokens rather than introducing ad-hoc spacing or third fonts.
- Preserve the established teal/ivory/sand/charcoal palette; use gold as a subtle accent. Maintain legible contrast.
- Keep photographic aspect ratios intentional; never stretch or replace authentic images to enforce uniformity. Check crops at narrow widths.
- Use the existing motion tokens and respect reduced motion. No reveal may prevent access to reading, links or booking.
- Hero, Studio workspace, checkout, forms and reservation controls have independent functional contracts. Do not force editorial layout onto them. Preserve the full-screen cinematic hero.
- Keep all route destinations, internal links, translation content, price data and payment logic intact.

## Release gate
- Run the existing Editorial System suite (24 routes, 393px and 1440px), Typography Regression, Homepage Structure Lock and booking/checkout checks.
- Check representative mobile and desktop screenshots; include navigation/footer, hero, Signature collection, Studio, Travel Designer, Corporate, Moments and contact. Review real-device Safari or WebKit when available.
- Validate overflow, wrapping, contrast, natural reading order and CTA usability. Do not claim visual approval based only on green tests.
- Record any intentional exceptions with their rationale. A CSS or screenshot test failure must be investigated, not silenced.
- Never merge or publish a visual change without checking its impact on the protected journeys.

The automated checks enforce selected numeric rules; subjective quality, photographic consistency and optical alignment still require human/visual review.
