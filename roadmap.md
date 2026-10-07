# Phase 1 optimization

# Urgent public layout repair — October 7
- [ ] Audit production and shared styles at 375px and desktop
- [ ] Repair proven About alignment and shared label-spacing gaps without changing content or SEO
- [ ] Run focused regression tests and verify rendered layouts
- [ ] Check security, publish and verify production

# October 5 performance-only cleanup

# October 5 Travel Designer enquiries and publication

- [x] Embed a journey enquiry form using the existing contact/admin/Conversions pipeline
- [x] Add a factual “Best travel designer in Portugal” selection guide using Local Stories
- [x] Verify enquiry persistence/admin counts, guide metadata, and mobile/desktop rendering
- [x] Complete safe performance fixes, check security, and request publication of the updates

- [x] Identify shared loading causes across the 13 requested pages
- [x] Apply only safe centralized media/priority/loading fixes
- [x] Verify focused tests, preview build, and Designer/Studio mobile + desktop
- [x] Report exact changes; keep SEO, appearance, booking logic and intentional noindex unchanged

- [x] Audit trust proof and centralize approved 4.9/5 · 1,000 reviews
- [x] Add quiet USD estimate / EUR checkout clarity
- [x] Strengthen tour detail reassurance and mobile booking CTA (sticky bar already compliant)
- [x] Improve /experiences perceived speed and reliability (already synchronous; no change needed)
- [x] Apply safe media and third-party performance wins (already in place; no risky changes)
- [x] Centralize typed analytics events and wire requested low-risk signals
- [x] Audit and safely fix technical SEO hygiene (no defects found)
- [x] Correct Press Kit link language
- [x] Validate specified EN/PT routes on mobile and desktop

# Conversion refinement pass

- [x] Clarify the homepage hierarchy between three primary and two secondary paths
- [x] Consolidate Signature reassurance into the booking decision area
- [x] Strengthen Studio chapter orientation without changing its flow
- [x] Add a Travel Designer action directly after operational proof
- [x] Validate key conversion routes at mobile and desktop sizes

# Public conversion and search clarity

- [x] Keep the three homepage buying paths dominant and Portugal-wide
- [x] Localize verified experience card copy and link multi-day alternatives
- [x] Surface tour-specific moments in the first screen and keep booking proof factual
- [x] Clarify About and structured organization identity without review schema
- [x] Keep existing booking and Studio flow safeguards unchanged
- [x] Check priority public pages at mobile and desktop widths

# Guide and admin calendar simplification

- [x] Unify guide and admin month controls and date selection
- [x] Add selected-day summaries and clearer status keys
- [x] Simplify both mobile navigation bars
- [x] Add Guide App home-screen installation action
- [x] Validate both calendars at mobile and desktop widths

# Founder-led About page

- [x] Rebuild the existing public About page around the approved founder narrative
- [x] Retain verified trust, legal, SEO, schema, navigation, and contact details
- [x] Reuse founder imagery and approved Studio and Travel Designer actions
- [x] Verify About at 393px and desktop with focused tests and link checks
- [x] Update the legacy About hero-structure check for the approved founder-led opening
- [x] Verify the existing Guide App sign-in, tours, availability, and profile flows
- [ ] Publish the new About page, then request Google to recrawl it (blocked: publication not authorized)

# Guide App v2 (preview only)

- [x] Safe tour brief: guest contact, itinerary, inclusions via guide_my_tours (no finance fields)
- [x] Precise availability: morning/afternoon/custom hours + calendar shortcut
- [x] New-assignment device notifications (foreground) + unread badge
- [x] Verify at 393px, finance-field exclusion, overlap guard, notification flow

- [x] Guide App corrections: snapshot itinerary + source_tour_id fallback, real partial-hour availability, server-side partial-hour assignment check (preview only)
- [x] Fix Guide App Home Screen launch and isolate its manifest/install prompt from the public PWA (must launch /guide)
- [x] Simplify Guide App to three tabs with one My Tours home for Today, Upcoming, and unread alerts
- [x] Validate signed-in My Tours states with safe mock data at 393px, then run focused checks
- [ ] Resubmit /about to Google + private-tour landing pages (needs owner scope decision)
- [ ] Auto-assign a guide after Studio payment (needs owner decision; currently office assigns)
- [ ] Guide self sign-up without saved email (needs owner approval model)

# Admin consolidation (preview only)

- [x] Operations home: Today, Upcoming (14 days), Needs attention
- [x] Vouchers & Payments tabs with one shared matching rule set
- [x] Rows open the single Booking Details page
- [x] Guide app invite sends real email (tested on owner's own guide profile)
- [x] Admin walk at 393px: Operations, Bookings, Vouchers & Payments

# Phase 3 admin simplification (preview only)

- [ ] Operations: clear Today / Upcoming / Needs attention list with optional calendar
- [ ] Bookings: single searchable/filterable list opening one detail page
- [ ] Booking Details: Tour / Guest / Operations / Payment & Vouchers / History
- [ ] Guides: concise directory and individual guide detail
- [ ] More: demote duplicate planning/calendar/technical destinations
- [ ] Verify signed-in mobile and desktop flows, focused tests and preview build

- [ ] Investigate checkout payment-step concern: live Stripe checkout already exists (cs_live_ sessions); verify what guest sees before paying and confirm end-to-end

- [x] Publish checkout inclusions fix + Guide calendar; confirmed live (home + /guide 200, guide.webmanifest 200)

# Local-search copy (preview only)

- [x] Refine homepage metadata and existing editorial sections for private Lisbon tours and Portugal travel designer intent
- [x] Refine the Lisbon wine guide using verified tour facts and add centrally sourced operator details
- [x] Verify focused SEO tests, mobile rendering and metadata

# Conversion surgery (Oct 2026, no publish)

- [ ] Finish the Studio walkthrough and open the Stripe payment screen (blocked: needs owner go-ahead, because it creates a pending booking in the shared database)
- [x] Check visibility of the group-size price note (keep €135)
- [x] Booking action easy to reach on the first phone screen (no stacked bars)
- [x] Reserve with no date → focus date + inline message
- [x] Tailor shown as a quieter secondary action
- [x] Children age info hidden until a child is added (check current state)
- [x] Mobile checkout drawer density
- [x] Plain-English pairing for "Signature" at booking points
- [x] Re-test at mobile + desktop

# Tailor instant pricing (supersedes manual confirmation)

- [ ] Remove Tailor "Request this day" gate and automatic Contact handoff
- [ ] Admin-editable Tailor Price Map (DB) seeded with approved rules only
- [ ] Admin completeness view: Missing price per tour
- [ ] Client + server price from the same map; reject unknown/tampered ids
- [ ] Price details ledger in Tailor; Contact/WhatsApp optional only
- [ ] Tests: client == server == Stripe; listed Tailor scenarios
- [ ] Owner enters missing prices before publish (blocked on Nídia)
- [x] Brand spelling: no 'YES!' anywhere public (owner correction)
