# Mobile checkout, contact delivery, and Google appearance

## Goal
Make every booking path feel fast and conversion-ready on mobile, ensure `/contact` reliably reaches the YES inboxes, and strengthen the signals Google uses for the brand name and search-result imagery without changing pricing, booking rules, content, or visual identity.

## Work

### 1. Mobile booking and payment
- Apply the existing on-demand loading pattern to the remaining Tailored and Studio checkout paths, so payment code is fetched only when the guest reaches the final gate.
- Preload the payment provider at the moment of clear booking intent, preserving the current secure-payment handoff.
- Tighten the shared guest-details and payment drawer layout for 393px and 430px screens: safe viewport height, visible title/summary/total, scrollable form/payment area, stable bottom action, keyboard-safe spacing, and no clipped controls.
- Keep all current price calculations, availability rules, Stripe calls, analytics, labels, trust copy, and motion unchanged.

### 2. Contact enquiries
- Verify the current sender-domain and delivery health, recent send outcomes, and both team recipients.
- Make the contact endpoint treat team notification delivery as a required observable outcome rather than silently reporting success when every team email fails.
- Preserve database capture first, guest confirmation, input validation, privacy, and one-email-per-recipient behavior.
- Add a safe delivery fallback/status response so a saved lead is never presented as emailed unless at least one YES inbox accepted it.
- Validate with a controlled contact submission and delivery-log evidence; do not expose personal data.

### 3. Google site name and images
- Keep the page title and visible copy unchanged while strengthening the homepage `WebSite`/Organization identity around “YES Experiences Portugal”. Remove the domain-shaped alternate name that can reinforce a URL-style site label.
- Verify the logo and favicon URLs are crawlable, square, sufficiently large, and consistent in prerendered HTML.
- Improve image-preview eligibility on the affected wine-tour result using the page’s real, high-quality tour imagery and `max-image-preview:large`; avoid unrelated logo thumbnails and duplicate image metadata.
- Preserve canonical, hreflang, sitemap, review-schema, and protected keyword strategy.
- Document the unavoidable limitation: Google chooses the displayed site name and thumbnail; code can provide stronger signals but cannot force either result immediately.

## Validation
- Focused unit tests for lazy boundaries, checkout mobile layout invariants, contact delivery outcomes, and site-name/image metadata.
- Real-browser mobile journeys at 393×852 and 430×932 through every Signature, Tailored, and Studio gate up to the payment form, without submitting payment.
- Controlled `/contact` submission with a unique test marker, followed by database/send-log confirmation that at least one YES inbox accepted the notification.
- Prerendered and production checks for homepage and affected tour/guide metadata, structured data, favicon/logo availability, and image URLs.
- Full typecheck and production build. Publishing is excluded unless explicitly requested after review.
