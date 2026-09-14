# Full-site audit: booking, copy, typography, motion, CTAs, admin, SEO

Goal: one structured pass that finds real defects across the whole site, reports them in plain
language, and fixes everything that doesn't need your decision. Mobile-first (393px), then tablet
and desktop.

## How it runs

Two stages so nothing is guessed:

1. **Audit + report** — walk every public page and every admin screen on a phone-sized viewport,
   collect findings into `docs/audit-2026-09/site-audit.md` as a short numbered list, each marked
   *fix now* / *needs your input*.
2. **Fix pass** — repair every *fix now* item in the same pass, then re-verify.

Nothing about prices, availability, payment logic, tour facts, hero wording or the top bar changes
unless a finding is a genuine defect there.

## What gets audited

### 1. Booking flow (highest priority)
- `/book` with and without a tour: date, guests, guest details, card payment opening, confirmation.
- Booking entry points on Signature day pages, region and area pages, Lisbon hubs, day-trip guides,
  Studio and the Tailor path — every "book" button must land on a working, correctly pre-filled page.
- The enquiry path when dates are flexible, plus the confirmation and follow-up emails.
- Dead ends: any button that opens a page with no price, no date, or no way to pay.

### 2. Copy consistency
- One vocabulary for the same action across the whole site (no mix of "Book", "Reserve",
  "Design & Book", "Continue" for the same step).
- Tone and sentence case per the brand rules; no repeated stock phrases across sections.
- Same facts everywhere: phone, licence, base, service areas, durations, group sizes, cancellation.
- Any invented detail (hours, inclusions, partners) is flagged for you, never rewritten by guess.

### 3. Typography
- Fraunces for headings, Inter for body, everywhere — flag any leftover family or hardcoded size.
- One H1 per page, no skipped heading levels, readable line length on long articles.
- Mobile sizes: no text under the minimum, no overflow, no cramped headline wrapping.

### 4. Animations
- Nothing that can leave a section invisible if the scroll trigger never fires.
- Motion within the agreed budget; homepage keeps its approved extra energy, other pages stay calm.
- Reduced-motion setting respected everywhere.

### 5. CTAs and duplication
- Each page keeps one clear primary action; secondary actions read as secondary.
- Remove repeated CTA bands, duplicated review blocks, and sections that say the same thing twice
  (a known risk on the Lisbon/wine/day-trip family of pages, which overlap heavily).
- Check nothing is hidden behind the floating WhatsApp button, sticky bars or the cookie notice.

### 6. Admin
Confirmed today: the admin home lists only 10 links, while 43 admin screens exist — so most tools,
including several you'd use weekly, can only be reached by typing the address. The menu is also in
Portuguese while the rest of the site is English.
Planned:
- Rebuild the admin home as a grouped index (Bookings & guests · Reviews · Enquiries · Prices &
  experiences · Content & photos · SEO & health · Diagnostics) covering every existing screen.
- Reviews approval front and centre: pending count on the home, pending list first on mobile,
  approve/reject reachable in one tap, and a check that approving actually publishes to `/reviews`.
- Verify what is truly editable versus read-only on each screen, and list any gap you'd expect to
  edit but currently cannot.
- One language for the admin menu (English, unless you prefer Portuguese).

### 7. SEO
- Unique title, description and social tags per page; find and fix duplicates and thin near-copies.
- Overlapping Lisbon/wine pages: decide which is the main page for each search term and point the
  others at it with clear internal links, so they stop competing with each other.
- Structured data valid on every public page; breadcrumbs, reviews and business details consistent.
- Sitemap in sync, no broken internal links, correct canonicals, headings matching search intent.
- Resubmit the sitemap after the fixes land.

## Technical notes
- Existing guardrails re-run after the fix pass: `check:route-meta`, `sitemap:check`, brand and
  contrast audits, `bunx tsgo --noEmit`, the Vitest suite, and the mobile/checkout Playwright specs.
- Playwright sweep at 393×852 with spot checks at 360 and 1280, capturing console errors, network
  failures, overflow and tap targets under 44px per route.
- Admin home rewrite is presentation only — it links existing screens, adds no new backend.
- Findings needing your input (real hours, missing facts, which page wins a keyword) are listed for
  a decision instead of being invented.

## Out of scope
Google Business Profile publishing and Google's per-URL indexing requests stay manual — Google
allows only the account owner to do those.
