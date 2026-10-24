# Homepage closing section + page-by-page simplification

## 1. Homepage — remove "Begin with the way that feels right"
- Delete the final sand section (`#final-cta`) at the end of the homepage. Its paths (Signature, Studio, Travel Designer, contact) already appear in the Five Ways cards.
- The homepage then ends with the FAQ, followed by the footer, which already holds the About, FAQ and contact links.
- Update any test that expects `#final-cta`. Nothing else on the homepage changes: Hero, Five Ways order and reviews stay locked.

## 2. Simplify the other pages, one at a time
Order: Experiences, Studio landing, Travel Designer, Moments (proposal), Corporate, About, Local Stories (index + articles), FAQ, Contact.

On each page:
- Remove sections that repeat an idea already shown on that page (for example a second intro, a repeated reassurance band, or a closing button band that repeats the opening action).
- Shorten supporting text to 2–3 compact sentences. Keep every fact: inclusions, prices, itinerary, policies and reviews.
- Keep one primary action per screen and use the canonical button names.
- Keep the approved conversion choices: the Travel Designer sample and enquiry form, the Corporate button that opens the contact form, and WhatsApp for "Talk to a local".
- Check each page on a 393px screen before moving on to the next.

## Out of scope
Checkout, prices, booking rules, SEO titles and descriptions (still frozen), the Hero, and Studio logic.

## Technical
- `src/routes/index.tsx`: remove the `#final-cta` section and drop any imports left unused (`MessageCircle` and others, if no longer referenced).
- Run the existing tests and update expectations that tied to removed sections only.
- Nothing is published without an explicit request.
