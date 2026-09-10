# SEO plan: rank for American travelers

## Where we stand today (checked, not assumed)

- Semrush (US market): 10 ranking keywords, all outside the top 10 except brand
terms. Best non-brand position is "sintra day tour from lisbon" at #40.
- Domain authority 8/100 — a young site. Realistic wins come from specific,
lower-difficulty phrases first, not "Portugal tours" head terms.
- 71 referring domains, but the top anchor texts are spam ("buy backlinks",
"PBN network"). Roughly 38 links look like a low-quality link scheme.
- The sitemap lists 31 core pages plus tours, guides and Portuguese twins, and
the crawl rules are already clean. Structured data is broad and well built.
- Search Console is connected and reporting.

So the foundations are good. What is missing is targeting the exact phrases
Americans type, and depth on the pages that can actually win.

## The demand we should own (US search volumes, Semrush)


| Phrase                         | Searches/mo | Difficulty      | Our page                |
| ------------------------------ | ----------- | --------------- | ----------------------- |
| day trips from lisbon          | 2,400       | 13 — very easy  | /day-trips-from-lisbon  |
| day trips from lisbon portugal | 1,600       | low             | same page               |
| lisbon tours                   | 1,600       | medium          | /lisbon-private-tours   |
| lisbon day trips               | 880         | low             | same page               |
| best day trips from lisbon     | 590         | low             | same page               |
| portugal trips packages        | 590         | medium          | /portugal-tours         |
| day tours from lisbon          | 480         | low             | /day-tours              |
| tours of portugal              | 480         | medium          | /portugal-tours         |
| small group tours of portugal  | 390         | medium          | new section             |
| sintra day tour from lisbon    | 320         | low             | already #40 — fix first |
| lisbon private tours           | 260         | medium          | /lisbon-private-tours   |
| luxury tours of portugal       | 260         | low competition | /luxury-tours-portugal  |
| private tours portugal         | 170         | 29 — easy       | /private-tours-portugal |


"day trips from Lisbon" at difficulty 13 with 2,400 US searches a month is the
single biggest, most winnable prize we have. It becomes the centrepiece.

Include best wine tours Lisbon and variants 

## What gets done

### 1. Rebuild /day-trips-from-lisbon into the definitive answer

Today it is a listing. Americans searching this want a comparison: where can I
go, how far, how long, is it worth it, how do I get there. We add a comparison
table of every destination (drive time, best season, half or full day, who it
suits), an "is it worth it?" verdict per destination, a Sintra vs Arrábida vs
Évora section, practical answers on pickup, timing and what to book, plus real
guest reviews and our booking path. Title and headings shift to the exact
"day trips from Lisbon" and "best day trips from Lisbon" wording.

### 2. Fix the Sintra page that is already close

"sintra day tour from lisbon" (320/mo) sits at #40 and the Sesimbra guide has
507 impressions with only 1.5% clicks. Both get rewritten titles and
descriptions written for an American reader, plus stronger, longer answers and
a clear booking CTA. This is the fastest movement we will see.

### 3. Six new pages for demand we do not answer yet

Each written to the same editorial standard, each with real tours, prices,
reviews and a booking path — never invented facts:

- Sintra day trip from Lisbon (dedicated, currently only a story)
- Best day trips from Lisbon (comparison and ranking)
- Small group and private tours of Portugal
- Portugal trip packages / how many days do you need
- Lisbon wine tours: Arrábida vs Alentejo (we already rank nowhere for wine)
- Portugal for American travelers (flights, jet lag, tipping, driving, money,
best months) — the page that catches early-stage US planners

### 4. Write for American readers throughout

US spelling, dollars shown alongside euros, distances in miles as well as km,
American reference points (flight times from JFK/EWR/BOS), and the questions
Americans actually ask. This affects the pages above and the main hubs.

### 5. Schema and sitemap tightening

Structured data is already strong; we complete it rather than rebuild:
add TouristTrip and offer data on every tour page, aggregate ratings where we
have real reviews, FAQ markup on each new page, breadcrumbs everywhere, and
speakable markup for voice results. Sitemap gets the new pages with proper
priority and last-modified dates, plus an image sitemap so our photography can
appear in Google Images.

### 6. Internal linking

Build a deliberate link structure: homepage and hubs point down to the new
pages, every guide links to its bookable tour, every tour links back to its
region and guide. This is how authority spreads on a young domain.

### 7. Deal with the spam backlinks

Around 38 links use "buy backlinks / PBN" anchors pointing at us. These were
not earned and can hold a young site back. I will prepare a disavow file; you
upload it once in Search Console (a two-minute step I cannot do for you).

### 8. Measurement

A baseline document with today's numbers and a 30/60/90 day tracking table, so
we can see exactly what moved.

## Honest expectations

New pages typically start showing in Google after 4–8 weeks and settle after
3–6 months. With authority at 8, the low-difficulty Lisbon day-trip cluster is
where first-page positions are realistic this quarter; broad terms like
"Portugal tours" come later, once these pages earn links and traffic.

## Technical notes

- New routes under `src/routes/`, each with its own `head()` — unique title,
description, og tags, self-canonical, and JSON-LD via helpers in
`src/lib/jsonld.ts` (`tourProductLd`, `faqPageLd`, `itemListLd`,
`localBusinessLd`, `breadcrumbLd`, `regionDestinationLd`).
- Content in `src/content/` alongside `lisbon-regions.ts` and
`local-stories-articles.ts`; tours resolved from `src/data/signatureTours.ts`
so pricing and availability stay server-authoritative.
- Sitemap: add routes then run `bun run sitemap:generate`; image sitemap added
as a new handler beside `src/routes/sitemap[.]xml.ts`.
- Existing e2e guards (`sitemap-robots-canonical`, `seo-head-contract`,
`seo-index-quality`) get their new paths added and must stay green.
- Disavow file written to `docs/seo/disavow-2026-09.txt`.
- No changes to pricing, checkout, Studio, booking or Portuguese routes.

## Sequence

1. Day-trips hub rebuild + Sintra/Sesimbra snippet fixes (fastest impact)
2. Six new pages
3. Schema, sitemap, internal linking
4. Disavow file + baseline doc
5. Publish, then verify live