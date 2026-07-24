# SEO Gap-Closing Plan — YES Experiences Portugal

## Current state (verified)

- Domain has ~3 organic keywords and ~39 estimated monthly visits (Semrush).
- 11 Signature tours exist; only 2 have explicit `seoTitle`/`seoDescription` overrides.
- Structured data is already wired on Signature pages (Product + TouristTrip + AggregateRating + BreadcrumbList + FAQPage).
- `/partners` hub exists with 3 platform pages (Viator, GetYourGuide, Tripadvisor).
- `/local-stories` content hub exists with SEO articles, but several high-intent wine phrases redirect to it without dedicated articles.
- No venue / winery / hotel partner pages exist yet.
- Sitemap already prioritises 4 SEO-focus tours (`arrabida-wine-allinclusive`, `southwest-vicentine-coast`, `troia-comporta`, `roman-heritage-alentejo`).

## Goal

Close the organic-visibility gap by turning existing Signature pages into high-intent landing pages, expanding the content hub around proven low-competition phrases, earning editorial backlinks through venue pages, and establishing monthly tracking.

## Phase 1 — Signature pages become landing pages (quick win, low credit)

1. Write unique `seoTitle` and `seoDescription` for the remaining 9 Signature tours, targeting the high-intent phrases the data already supports:
  - `arrabida-boat` → "Arrábida boat trip from Lisbon | Private coastal day tour"
  - `azeitao-cheese` → already has one; refine if needed
  - `sintra-cascais` → "Sintra and Cascais private tour from Lisbon"
  - `troia-comporta` → "Tróia & Comporta private tour from Lisbon"
  - `evora-alentejo` → "Évora private tour from Lisbon | Alentejo day trip"
  - `roman-heritage-alentejo` → "Alentejo wine tour from Lisbon | Roman heritage"
  - `southwest-vicentine-coast` → "Southwest Vicentine Coast tour from Lisbon"
  - `wild-beaches-picnic` → "Wild beaches picnic from Lisbon | Arrábida coast"
  - `tiles-workshop` → "Portuguese tiles workshop Lisbon | Azulejos experience"
  - `tomar-coimbra` → "Tomar and Coimbra private tour from Lisbon"
  - `fatima-nazare-obidos` → "Fátima, Nazaré & Óbidos private tour from Lisbon"
2. Ensure every title is < 60 chars and every description is < 160 chars.
3. Keep the existing auto-build fallback so future tours are never un-optimised.
4. Add an E2E assertion that every Signature page emits a non-generic `<title>` and `<meta name="description">`.

## Phase 2 — Content hub expansion (medium effort)

Create new `/local-stories` articles for validated high-intent phrases, each linking to the matching Signature tour:

1. "Private wine tour Lisbon — Arrábida, Alentejo or a custom day" → link to `/tours/arrabida-wine-allinclusive` and `/tours/roman-heritage-alentejo`.
2. "Alentejo wine tour from Lisbon — what a private day looks like" → link to `/tours/roman-heritage-alentejo`.
3. "Arrábida day trip from Lisbon — wine, coast and lunch" → link to `/tours/arrabida-wine-allinclusive`.
4. "Best wine tasting near Lisbon — Setúbal, Arrábida and Azeitão" → link to `/tours/azeitao-cheese`.
5. "Private tours from Lisbon — Sintra, Arrábida or Alentejo" → hub-style article linking to multiple Signatures.

For each article:

- Unique `<title>`, `<meta name="description">`, H1, and standfirst.
- Article/BlogPosting JSON-LD with author and datePublished.
- 1 internal link to the primary Signature tour and 1–2 related tours.
- Add to `sitemap.xml` with `priority="0.75"` and `changefreq="monthly"`.
- Add a redirect route from the raw keyword slug (e.g. `/private-wine-tour-lisbon`) to `/local-stories/private-wine-tour-lisbon` only where it does not already exist.

## Phase 3 — Venue pages for backlinks (higher effort)

Build a `/venues` hub and individual venue pages for real partners/cellars visited on Signature tours. These are designed to attract editorial and resource backlinks.

1. Create `src/data/venues.ts` with real venues only (no invented partners):
  - Example: the Azeitão/Moscatel cellars used in `arrabida-wine-allinclusive` and `azeitao-cheese`.
  - Example: the Alentejo winery used in `roman-heritage-alentejo`.
2. Each venue page gets:
  - Unique title/description and H1.
  - `TouristAttraction` + `LocalBusiness` JSON-LD.
  - BreadcrumbList.
  - Link to the Signature tour that visits it.
  - A short, factual description (no superlatives, no invented claims).
3. Add `/venues` to the sitemap and footer navigation under "For partners".
4. Add a small "Venues we work with" link from the `/partners` hub.

## Phase 4 — Internal linking and authority flow

1. Add a contextual "Related experiences" block at the bottom of each Local Story article, linking to 2–3 relevant Signature tours.
2. Add a "Also read" link from each Signature page to its matching Local Story (when one exists).
3. Ensure the `/partners` hub links to `/venues` and vice versa.
4. Add `rel="nofollow noopener"` only to external platform links; keep internal links followable.

## Phase 5 — Tracking and monthly reporting

1. Add an `/admin/seo-dashboard` panel that shows:
  - GSC property status and verification.
  - Sitemap last generated date and URL count.
  - Signature pages missing `seoTitle`/`seoDescription`.
  - Local Stories without a matching Signature link.
2. Store a monthly snapshot of:
  - Total indexed pages (manual GSC input field + link to GSC).
  - Target keyword list and current Semrush rank estimate.
3. Add a scheduled reminder (email/Slack optional) to review the dashboard monthly.

## Success metrics

- All 11 Signature pages have unique `<title>` and `<meta name="description">` within 60/160 chars.
- At least 5 new Local Stories published targeting the high-intent phrases above.
- At least 3 real venue pages live in `/venues`.
- Sitemap contains every new route, no duplicates, no redirect URLs.
- Zero SEO scanner findings for missing metadata or sitemap issues.
- Baseline organic keyword count recorded; target: 2x within 90 days.

## Open question before implementation

Douro Valley is the largest wine-search volume, but there is currently no Douro Signature tour or Local Story with a bookable product. Should the plan include creating a Douro Valley Signature experience, or should we defer Douro content until a real itinerary exists? No, we don't have that yet 