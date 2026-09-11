# Complete booking operations, regional SEO, and travel stories

## What will be delivered

1. **Booking operations**
   - Keep the existing live-price checkout and payment confirmation flow unchanged.
   - Add an admin-only cancellation action from each booking record.
   - When a paid booking is cancelled, request the refund through the existing payment account, update the booking safely and idempotently, and preserve the frozen purchase record.
   - Send the guest a branded cancellation/refund confirmation and notify the team.
   - Synchronize relevant refund events received from the payment provider so the dashboard remains accurate even when a refund starts outside the site.

2. **Regional wine-tour visibility**
   - Strengthen Arrábida, Azeitão, and Alentejo pages around “private wine tours Lisbon” and “best Lisbon wine tours” without duplicating copy.
   - Retain real pickup details, local reviews, opening hours, phone details, booking links, and local business schema.
   - Add useful internal links between the wine hub, region pages, guides, and matching real trips.

3. **Portugal travel stories**
   - Add three substantial editorial stories covering Lisbon neighborhoods, local culture, and must-visit places using only verified project facts.
   - Include unique metadata, one H1, article and breadcrumb schema, relevant images where already available, and contextual links to real experiences.
   - Feature these stories from the Portugal guide for American travelers and the Local Stories index.

4. **Verification and release**
   - Test admin authorization, cancellation/refund safeguards, booking status updates, emails, mobile layouts, metadata, links, and sitemap inclusion.
   - Check the current preview for the router dispatcher error and confirm key pages render without console errors.
   - Publish the verified version and confirm the public booking and editorial pages load correctly.

## Technical details

- Privileged cancellation runs only in an authenticated, server-side admin function after a database role check.
- Refund requests use the existing payment setup and payment-intent reference; repeat requests must not create duplicate refunds.
- Payment webhooks remain signature-verified and become the authoritative status synchronizer.
- Existing pricing, availability, checkout metadata, frozen snapshots, privacy rules, and Signature/Studio/Tailor behavior remain unchanged.
- No invented reviews, addresses, prices, pickup promises, stops, or itinerary details will be introduced.
