# Roadmap

## 1. Studio booking polish (mobile)
- [x] Sticky price summary during card entry
- [ ] Clear decline/error text + spinner, no double-tap
- [x] Confirmation email as a real travel document
- [x] Bookings dashboard: today / upcoming / needs attention, guest search, tap-to-call & WhatsApp

## 2. Content: Lisbon day trips + Arrábida wine
- [x] Rebuild day-trips hub with comparison table
- [x] New Arrábida wine hub
- [x] 4 supporting guides
- [x] FAQ layer + FAQ schema on hubs

## 3. Press kit and outreach
- [x] /press route (already existed)
- [ ] Researched outreach shortlist + templates document

## 4. Guide attribution + internal linking
- [x] Click-time guide attribution (session/local storage, 30 days) — internal links are clean canonical URLs, no query params
- [x] Attribution carried through checkout into bookings
- [x] /admin/guide-attribution dashboard
- [x] "Where to next" block: hub → siblings → Signature → Studio

## 5. SEO index quality (revenue recovery)
- [x] Retire `?ref=…&ref_slot=…` internal link variants (79 crawl issues); legacy shared links still attribute
- [x] Utility pages (`/pt/contact`, `/privacy`, `/cookies`, PT twins) = noindex, follow, out of sitemap, hreflang kept
- [x] 10-day sample itinerary substantive + FAQ/Trip schema; Azeitão FAQ full-day truth
- [x] Regressions: `seo-index-quality.test.ts`, `guide-attribution.test.ts`, e2e `seo-conversion-index-quality.spec.ts`
- [ ] Request re-crawl of the affected Local Stories + tour pages in Search Console once published
- [ ] After next SiteGuru crawl: confirm parameter-variant count drops to 0 and soft-404 flags clear
