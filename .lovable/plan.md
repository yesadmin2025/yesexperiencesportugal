## Goal
Get yesexperiencesportugal.com discoverable on Google **for American travelers** planning a Portugal trip. Strategy remains US-intent long-tail keywords + US market signals + editorial content Americans actually search — not head terms.

**Positioning to reinforce in every rewrite:** local & hidden Portugal · personalized private · Travel Designer · real-time itinerary builder · instant confirmation · unique and only in Portugal.

---

## Status snapshot (July 2026)

### ✅ Phase 1 — Foundation (COMPLETE)
- US-oriented metadata rewritten on the 10 core pages (Home, /experiences, /studio-v3, /about, /contact, tour pages, /proposal-in-portugal, /pt).
- USD alongside EUR + real `AggregateRating` (Viator counts, no invention) on tour pages.
- Organization / TouristTrip / Offer / BreadcrumbList JSON-LD in place. `sameAs` → real Viator, TripAdvisor, Instagram.
- `hreflang="en-us"` on English routes; Search Console targeting US.
- Robots + sitemap.xml audited; internal 301s consolidated onto canonical URLs (see `src/routes/*.tsx` redirects).
- Alt text + h1→h2→h3 chain fixed on Home, About, tour pages.
- Last SEO scan: **0 failing findings** (previous three marked fixed, awaiting rescan).

### ✅ Phase 2 Tier 1 — Lisbon pillars (LIVE)
| Page | Route |
|---|---|
| Best day trips from Lisbon | `/local-stories/best-day-trips-from-lisbon` |
| Best wine tours from Lisbon | `/local-stories/portugal-wine-tours` + `/local-stories/arrabida-wine-tour` |
| Private tours from Lisbon | `/local-stories/private-wine-tour-lisbon` + region private-tour stories |

All Tier 1 articles now carry the intent-aware **StoryInternalLinks** block (wine → wine-and-gastronomy plan; day-trip → 5-day plan; private → 7/14-day plan by region), routing US readers to Studio + matching Signature + matching itinerary.

### ✅ Phase 2 Tier 2 — Planners & regional guides (LIVE)
- `/plan/5-day-portugal-itinerary`, `/plan/7-day-portugal-itinerary`, `/plan/14-day-portugal-itinerary` (+ existing `/itineraries/10-day-private-portugal-tour`).
- `/plan/portugal-wine-and-gastronomy` pillar.
- Regional guides: `/plan/lisbon`, `/plan/sintra`, `/plan/alentejo`, `/plan/arrabida`, `/plan/comporta`, `/plan/costa-vicentina`.
- Hub at `/plan` with CollectionPage + ItemList JSON-LD.

---

## Next priorities (revised)

### Tier 3 — Fill remaining high-intent US gaps
Draft in this order; each needs `keyword_research` (US database) before publishing.

1. `/plan/douro-valley-wine-tour-from-porto` — "douro valley wine tour" (US)
2. `/plan/lisbon-to-sintra-day-trip` — "day trip to sintra from lisbon"
3. `/plan/best-time-to-visit-portugal` — "best time to visit portugal"
4. `/plan/portugal-honeymoon` — "portugal honeymoon"
5. `/guides/arrabida-vs-douro` — comparison, low-KDI long-tail
6. `/guides/is-portugal-safe-for-americans` — reassurance intent, high US volume

Each: 900–1,400 words, one real hero image, `FAQPage` schema, author byline, "Updated {date}", intent-aware internal-link block to Studio + Signature + matching plan.

### Positioning & schema refresh (differentiators)
Weave these into every existing Tier 1/2 page + new Tier 3:
- **Real-time itinerary builder + instant confirmation** → surface on tour pages and pillars in the standfirst *and* in `TouristTrip` / `Offer` schema (`availability: InStock`, `validFrom/validThrough`, "Instant confirmation" in `Offer.description`).
- **"Travel Designer" + "personalized private"** → primary CTA copy on every editorial page ("Talk to a Travel Designer") + `Service` schema on `/multi-day` and `/plan/*` pillars with `serviceType: "Private travel design"`.
- **Local & hidden Portugal + "only in Portugal"** → hero eyebrow / `about` prop in schema (`about: [{name: "Local & hidden Portugal"}, {name: "Unique in Portugal"}]`), plus in-copy anchor phrase per article.

### Phase 3 — Authority (ongoing, parallel)
Unchanged. Backlink outreach + Google Business Profile remain with the user; agent drafts pitch copy on request.
1. Guest post on Salt in our Hair / Portugalist.
2. Pitch Condé Nast Traveler / Travel+Leisure "small-group operators" roundups.
3. Partner links from wine estates, Sintra hotels, Lisbon concierges.
4. HARO / Qwoted replies to US Portugal queries.
5. Portuguese-American associations, US-Portugal chambers of commerce.
6. Google Business Profile in Lisbon → US "map pack".

### Phase 4 — Measure
- Weekly `semrush--seo_trend`; note US keywords entering top-100.
- Monthly `semrush--top_pages` → double down on what pulls.
- Search Console: US impressions + CTR iteration on pages with impressions but weak CTR.

---

## What I'll do first if you approve
1. `semrush--keyword_research` on the six Tier 3 phrases (US) to lock volume + KDI before drafting.
2. Weave the four positioning anchors (local & hidden · personalized private + Travel Designer · real-time builder + instant confirmation · only in Portugal) into existing Tier 1/2 standfirsts and JSON-LD.
3. Draft Tier 3 pages in the order above for your review before publishing.

## Out of scope (per guardrails)
- No invented itineraries, partners, review counts, or prices.
- No head-term SEO ("Portugal tours") until Authority Score climbs.
- No generic AI travel content — every guide passes the Studio philosophy check.
- No changes to Studio, homepage hero copy, or brand tokens.
