# Unify the remaining public conversion surfaces

## Goal
Bring tour details, Travel Designer, Studio entry, Moments, Corporate, and the shared header/footer into the approved 21 September premium system without altering facts, routes, SEO, pricing, booking, Studio logic, or integrations.

## Confirmed changes

### 1. Signature tour details
- Replace local hero and card heading sizes with the shared H1/H3 scale while preserving every title and tour fact.
- Keep location, duration, private status, price, and “Reserve this day” together in the first decision area; retain “Tailor this day” as the quieter secondary action.
- Normalize major section spacing to 64px mobile / 96px desktop and compact reassurance spacing to 48px / 64px.
- Align highlights, inclusions, practical notes, itinerary stops, and related-tour titles to shared typography and scanning patterns.
- Preserve every booking anchor, tailor destination, cancellation statement, image, and factual list.

### 2. Travel Designer
- Treat `/multi-day` as the primary multi-day conversion surface and keep the approved Travel File bridge immediately after its proof, with “Design my journey” and WhatsApp unchanged.
- Bring local headings, card titles, labels, and section spacing onto shared tokens; retain national Portugal positioning.
- Calm decorative treatments where they compete with the journey proposition, without changing copy strategy or page structure.
- On the supporting `/portugal-travel-designer` page, normalize the oversized local H2 rule and make its closing action point clearly to the multi-day journey path.

### 3. Studio entry only
- Update only the opening welcome/name screens: shared Fraunces/Inter hierarchy, 40px mobile / 60px desktop H1, approved CTA label “Design your day,” quieter optional-name step, and immediate action visibility.
- Preserve the current background media and all subsequent Studio phases, calculations, composition, pricing, availability, persistence, and checkout behavior.

### 4. Moments and Corporate
- Normalize H1/H2/H3 scale and 64/96 section rhythm across both service pages.
- Keep Moments focused on private special moments, retain “Plan a special moment,” and verify its enquiry form has no visible Company field.
- Keep Corporate’s preselected `/contact?type=corporate` action and WhatsApp “Talk to a local” behavior exactly as implemented.
- Remove only excess visual weight such as repeated decorative rules or mismatched local heading sizes; preserve all factual service copy and imagery.

### 5. Header and footer
- Keep the three primary paths grouped first: Signature Experiences, Studio, Travel Designer; Moments and Corporate remain secondary.
- Align desktop and mobile labels, typography, spacing, focus/press states, and minimum touch targets without adding links or clutter.
- Simplify footer visual hierarchy so navigation, proof, and partner seals remain useful but subordinate; preserve every legal/contact destination.
- Confirm the verified 4.9/5 and 1,000 guest reviews wording and remove no legal or trust information.

### 6. Motion and safeguards
- Reuse the current reveal system only: 18px mobile / 22px larger screens, approximately 600ms editorial easing, 110ms stagger.
- Keep reduced-motion immediate and fully visible.
- Do not add masks, parallax, looping ornament, new shadows, or a parallel animation system.

## Validation
- Inspect two representative Signature pages, `/multi-day`, `/portugal-travel-designer`, `/studio-v3` entry, `/proposal-in-portugal`, and `/corporate` at 393px and 1280px.
- Verify no horizontal overflow, cut or hidden actions, competing primary actions, or visible “700+”.
- Verify mobile navigation opens, scrolls, and closes correctly; footer remains readable and subordinate.
- Verify exact CTA destinations and form fields without submitting bookings or enquiries.
- Run TypeScript, CSS/motion checks, and focused public visual/conversion regression tests.
- Do not publish.

## Explicitly untouched
SEO metadata and structured data, sitemap/robots/hreflang, route architecture, copy strategy, tour facts, prices, inclusions, availability, booking/payment behavior, Studio steps and logic, database/admin surfaces, integrations, and emails.
