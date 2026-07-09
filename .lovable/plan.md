# Phase 2 · SEO Technical / Metadata / Schema Audit (plan only — no code changes)

Findings, exact fixes, and implementation order. Nothing is edited yet.

---

## 6) Sitemap · robots · canonicals · indexation

### What's already good (no change)

- `public/robots.txt`: `Allow: /`, explicit `Disallow` for `/admin`, `/auth`, `/booking-confirmed`, `/brand-qa`, `/builder`, `/checkout`, `/e2e`, `/email`, `/hero-verify`, `/lovable`, `/preview-check`, `/qa`, `/s/`, `/i/`, `/studio-drift`, `/studio-v2`, `/typography-audit`, `/unsubscribe`. `Host` + `Sitemap` directives point at `https://yesexperiencesportugal.com`. Correct.
- `src/routes/sitemap[.]xml.ts` is a server route (dynamic), lists real static routes + `signatureTours` + `LOCAL_STORIES_ARTICLES` + published DB posts. No placeholder / `$slug` entries. Base URL correct.
- `src/routes/__root.tsx`: sitewide `robots: index,follow,max-image-preview:large`, no accidental noindex. Two Google Search Console verification tokens present.
- `/local-stories/%24slug` already redirects in `beforeLoad` (Phase 1 landed the 301).

### Issues found

| # | Issue | Fix | Files | Risk |
|---|---|---|---|---|
| 6a | Sitemap declares 4 SEO focus tour IDs. `southwest-vicentine-coast`, `troia-comporta`, `roman-heritage-alentejo`, `arrabida-wine-allinclusive` all exist in `signatureTours`. ✅ | none | — | none |
| 6b | Sitemap MISSING: `/faq`, `/reviews` (present), `/moments`, `/proposals`, `/proposal-in-portugal` (present), `/press` (present), `/tomar-coimbra` (route file: none — only `itineraries/10-day...`). `/moments` route exists but is not in sitemap. `/faq` route exists but is not in sitemap. Also missing: `/day-tours`, present. | Add `/faq` and `/moments` to `staticEntries` if user wants them indexable. `/proposals` route exists (see note below) — decide index vs no. | `src/routes/sitemap[.]xml.ts` | low |
| 6c | Duplicate/near-duplicate destination routes: `/portugal-tours`, `/luxury-tours-portugal`, `/private-tours-portugal`, `/portugal-travel-designer`, `/multi-day` all sit in sitemap and target overlapping intent. `/multi-day` is the canonical Travel Designer entry (per Phase 1). `/portugal-travel-designer` duplicates its intent. | Pick one canonical Travel Designer URL (`/multi-day`) and 301 `/portugal-travel-designer` → `/multi-day`; drop from sitemap. Keep the 3 "portugal-tours" landing variants only if each targets a distinct SERP intent — otherwise consolidate. Ask the user before consolidating landing pages. | `src/routes/portugal-travel-designer.tsx`, sitemap | medium (SEO ranking risk) |
| 6d | Near-duplicate signature-anchor routes: `/arrabida-wine-tour` + `/tours/arrabida-wine-allinclusive` + `/arrabida-day-trip-from-lisbon`; `/wine-tours-lisbon` + `/portugal-wine-tours` + `/private-wine-tour-lisbon`; `/sintra-day-tour-from-lisbon` + `/tours/sintra-cascais`; `/alentejo-wine-tour-from-lisbon` + `/evora-alentejo-wine-tour` + `/evora-private-tour-from-lisbon` + `/tours/evora-alentejo`. Each SEO landing page currently self-canonicals, so Google sees each as a distinct page pointing at closely related content. | Recommendation: keep both — the SEO landing is an intent-optimised hub, the `/tours/$id` is the product page. But cross-link them and confirm every SEO landing's canonical is self and its "book" CTA points to the `/tours/$id`. Not a launch blocker; leave as-is unless the user wants consolidation. | — | low |
| 6e | `/day-trips-from-lisbon` present in sitemap AND `local-stories.$slug.tsx` special-cases the article `best-day-trips-from-lisbon` to canonical to `/day-trips-from-lisbon`. Good — the article is de-listed from static article entries. Confirm the article body renders `noindex` OR redirects when hit directly. Currently it renders the article with `canonical` pointing elsewhere — that's a valid "canonical to preferred URL" pattern, but ideally the article path should 301 to the canonical instead. | Change `local-stories/best-day-trips-from-lisbon` `beforeLoad` to `throw redirect({ to: "/day-trips-from-lisbon", statusCode: 301 })`. Removes duplicate-content risk. | `src/routes/local-stories.$slug.tsx` | low |
| 6f | Preview/dev routes present in the app but excluded from sitemap AND robots — good. `/qa.hero.tsx`, `/qa.mobile.tsx`, `/hero-verify.tsx`, `/preview-check.tsx`, `/typography-audit.tsx`, `/brand-qa.tsx`, `/e2e.postmessage-probe.tsx` — none add `noindex` at the route level. They're blocked by robots but if a link is ever discovered externally Google could still index the URL. | Add `{ name: "robots", content: "noindex, nofollow" }` to each dev/QA route's `head()`. Cheap belt-and-braces. | 7 QA/preview routes | low |
| 6g | Admin routes (`/admin*`) — blocked by robots. Same belt-and-braces `noindex` recommended on the `/admin` layout route (single `head()`). | Add noindex to `admin.tsx` (or the first admin route if no layout). | admin routes | low |
| 6h | `/checkout/$token`, `/s/$token`, `/i/$token`, `/review/$token`, `/booking-confirmed`, `/studio-v2.i.$token` — token/private URLs. Blocked by robots. Confirm each has `noindex, nofollow` at route level. | Verify + add where missing. | 6 route files | low |
| 6i | `/auth.tsx` — should be noindex. Verify. | Verify + add. | `src/routes/auth.tsx` | low |
| 6j | `/lovable/*` sub-tree bypassed in root `beforeLoad`. That's a Lovable-preview namespace. Already Disallow'd in robots. Good. | none | — | none |
| 6k | Sitemap emits `<lastmod>` = today for every static entry on every request. Google prefers stable `lastmod` values reflecting real content change; a rolling "today" trains crawlers to ignore the field. | Replace `today` with a git-derived or content-hash last-modified date per route, OR strip `<lastmod>` from static entries entirely (dynamic entries keep real `published_at`). Recommended: drop `<lastmod>` from static entries. | sitemap | low |
| 6l | Sitemap includes `/reviews` at priority 0.7 but the route is thin (aggregated widget). Confirm it has ≥1 screen of unique content before keeping. If it's just a Trustpilot iframe, remove from sitemap. | Check page body, then decide. Non-blocking. | `src/routes/reviews.tsx`, sitemap | low |
| 6m | `og:url` on some routes (e.g. `wine-tours-lisbon`) hard-codes `SITE_URL` from `@/lib/jsonld`, others use literal string. All resolve to the same host, so no behaviour drift, but centralise via a `SITE_URL` import for consistency. | Cosmetic. Non-blocking. | multiple leaves | none |
| 6n | Root emits `og:locale: en_GB` + alternates `pt_PT`, `es_ES` — but no `/pt`, `/es` routes exist. Locale alternates without matching URLs mislead crawlers. | Drop `og:locale:alternate` until PT/ES routes exist. | `__root.tsx` | low |
| 6o | Root `keywords` meta is ~350 chars of keyword-stuffed copy. Google ignores `keywords` for ranking; Bing may penalise stuffing. | Delete the `keywords` meta from `__root.tsx` (and the per-route `keywords` in `wine-tours-lisbon.tsx` + `arrabida-wine-tour.tsx`). | `__root.tsx` + 2 leaves | low |

### Pages that SHOULD be indexable (confirm present in sitemap)
`/`, `/about`, `/contact`, `/press`, `/reviews` (if content justifies), `/experiences`, `/studio-v3`, `/day-tours`, `/multi-day`, `/corporate`, `/proposal-in-portugal`, `/local-stories`, all `/local-stories/{slug}` real slugs, all `/tours/{id}` in `signatureTours`, all SEO landings (wine, arrabida, sintra, alentejo, evora, day-trips-from-lisbon, itineraries/10-day), `/terms`, `/privacy`, `/cookies`, `/faq`, `/moments`.

### Pages that should be EXCLUDED
All `/admin*`, `/api/*`, `/auth`, `/booking-confirmed`, `/brand-qa`, `/builder` (redirect stub), `/checkout/$token`, `/e2e.*`, `/email/*`, `/hero-verify`, `/i/$token`, `/lovable/*`, `/preview-check`, `/proposals` (form UI), `/qa.*`, `/review/$token`, `/s/$token`, `/studio-drift`, `/studio-v2*`, `/typography-audit`, `/unsubscribe`.

### Routes that should return 301 / 404
- `/local-stories/best-day-trips-from-lisbon` → 301 `/day-trips-from-lisbon` (6e).
- `/portugal-travel-designer` → 301 `/multi-day` (6c, if user approves consolidation).
- `/local-stories/%24slug` and placeholder slugs → 301 `/local-stories` (already landed Phase 1).
- `/index` → 301 `/` (already in root `beforeLoad`).
- `/builder`, `/studio-v2` → redirect to `/studio-v3` (already present).

### Complexity
§6 is a mix of low-risk sitemap/head edits (1–2 hrs) and one medium-risk consolidation decision (§6c) that needs user confirmation before touching.

---

## 7) Top-10 meta title / description cleanup

Char counts include the pipe/em-dash and brand suffix. Google truncates titles ~60 chars, descriptions ~155 chars.

| Page | Current title (chars) | Current description | Proposed title | Proposed description | Priority | Risk |
|---|---|---|---|---|---|---|
| `/` | "Private Portugal Tours, Designed With a Local | YES" (52) | "Private day tours, live-designed experiences and full Portugal journeys — shaped by a licensed local team based in Sesimbra. Instantly confirmed." (149) | **Keep existing** — it's already unique, under 60, matches intent. User's suggested "Private Portugal Tours & Real-Time Trip Builder | YES Experiences Portugal" is 74 chars → truncates. Alt: **"Private Portugal Tours & Real-Time Trip Builder | YES"** (54). | Same as current, works. | P0 | low |
| `/about` | "About YES Experiences Portugal | Founder-Built Travel" (54) | (short local intro) | **"About YES Experiences Portugal | Founder-Led Private Travel"** (60) | "Founder-led private tour operator based in Sesimbra since 2022. Meet the local team behind YES — licensed RNAAT nº 31/2023, Portugal-wide." (139) | P0 | low |
| `/corporate` | "Team Building Portugal — Private Corporate Days & Retreats" (58) | present | **"Corporate & Private Group Experiences in Portugal | YES"** (56) | "Private corporate days, team retreats and group experiences across Portugal — designed and hosted by a licensed local operator. Instant briefing." (147) | P1 | low |
| `/multi-day` | "Travel Designer Portugal | Private Journeys by YES" (51) | present | **"Private Multi-Day Portugal Journeys | Travel Designer by YES"** (60) | "Full private Portugal journeys, designed with a local travel designer — shaped around your time, rhythm and interests. Delivered as a complete file." (152) | P0 | low |
| `/portugal-wine-tours` | "Portugal Wine Tours — Arrábida, Setúbal & Alentejo | YES" (57) | present | **"Portugal Wine Tours | Private Wine Days by YES Experiences"** (60) | "Private wine days across Arrábida, Setúbal, Alentejo and Douro — small family cellars, slow lunches and real winemakers. Designed by a local team." (150) | P0 | low |
| `/wine-tours-lisbon` | "Best Wine Tours from Lisbon — Arrábida, Comporta & Alentejo" (60) | present | **"Private Wine Tours from Lisbon | Arrábida & Alentejo by YES"** (60) | "Private wine tours from Lisbon — Arrábida, Setúbal, Comporta and Alentejo. Real family cellars, no group buses. Book a licensed local operator." (146) | P0 | low |
| `/arrabida-wine-tour` | "Arrábida Wine Tour from Lisbon — Three Family Cellars" (54) | present | **"Arrábida Wine Tour from Lisbon | Private Azeitão & Setúbal Day"** (63 → trim) → **"Arrábida Wine Tour from Lisbon | Private Azeitão Day"** (54) | "Private Arrábida wine day from Lisbon — three family cellars in Azeitão, Moscatel tasting and a slow lunch. Licensed local operator, instant confirm." (152) | P0 | low |
| `/tours/arrabida-wine-allinclusive` | Auto-built from `t.title` + suffix (currently ≤60 via title-truncation helper). Actual: "Arrábida Wine Tour — All-Inclusive — YES experiences Portugal" (≈62 → helper trims). Description = `t.blurb` from `signatureTours`. | **Override** the auto-title for the top-4 SEO focus tours only — set an explicit `seoTitle` field on the `signatureTours` entry. For arrabida-wine-allinclusive: **"Arrábida Private Wine Tour from Lisbon | All-Inclusive by YES"** (62 → shorten to **"Arrábida Private Wine Tour from Lisbon | All-Inclusive"** = 55). | Description: use the existing `t.blurb`, verify it's ≤155 chars and unique per tour. | P0 | low |
| `/tours/azeitao-cheese` | Auto-built: "Azeitão Cheese & Wine — YES experiences Portugal" (49) | `t.blurb` | **"Azeitão Cheese & Wine Tour from Lisbon | Private Day by YES"** (60) via `seoTitle` on the tour. | Existing blurb, verify uniqueness. | P1 | low |
| `/local-stories/best-wine-regions-near-lisbon` | article.title + " | YES experiences Portugal" (varies) | article.metaDescription (varies) | **"Best Wine Regions Near Lisbon | Local Guide by YES"** (52) | "Which wine regions to visit from Lisbon — Setúbal, Alentejo, Tejo and Bairrada compared by a local. Distances, best cellars, when to go." (137) | P1 | low |

Implementation shape: string constants at top of each route file (already the pattern). For `/tours/$id`, add optional `seoTitle?: string` + `seoDescription?: string` on `SignatureTour` interface, prefer them in the head builder, fall back to `title`/`blurb`. Touches `src/data/signatureTours.ts` + `src/routes/tours.$tourId.tsx` head only.

Affected files: 8 route files + `src/data/signatureTours.ts`. Complexity: 1–2 hrs. No visual impact.

---

## 8) Homepage JSON-LD (Organization + WebSite)

### Current state

`src/lib/jsonld.ts` already exports `organizationLd()` + `websiteLd()` emitted from `__root.tsx`. The Organization node uses `"@type": ["TravelAgency", "LocalBusiness"]`. RNAAT nº 31/2023 is real, so `TravelAgency` is legally defensible — **but** the user's brief says "Do not use TravelAgency unless the legal registration status fully supports it." It does. Either keep TravelAgency (recommended — richer knowledge-panel signals) or downgrade to `Organization` + `LocalBusiness` per the brief.

The current node also carries `hasOfferCatalog`, `makesOffer`, `aggregateRating` (via `withAggregateAndReviews` on some pages), founder link, `sameAs` links (Instagram, Facebook, Tripadvisor, LinkedIn, Google Business Profile search URL).

### Recommendation

**Option A (conservative — matches user brief):** Downgrade Organization node to `["Organization", "LocalBusiness"]` only. Keep everything else. Drop `TravelAgency`.

**Option B (keep current):** Retain `TravelAgency` — Google explicitly supports it and RNAAT nº 31/2023 backs the claim.

Recommend **Option B**, since the legal registration does support it. Ask user before downgrading.

### Draft JSON-LD (conservative variant matching brief exactly)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://yesexperiencesportugal.com/#organization",
      "name": "YES Experiences Portugal",
      "url": "https://yesexperiencesportugal.com/",
      "logo": "https://yesexperiencesportugal.com/brand/png/yes-experiences-portugal-centered-full@2x.png",
      "description": "Licensed Portuguese tour operator (RNAAT nº 31/2023), based in Sesimbra, designing private personalized journeys across Portugal.",
      "email": "info@yesexperiencesportugal.com",
      "telephone": "+351911889992",
      "address": { "@type": "PostalAddress", "addressLocality": "Sesimbra", "addressRegion": "Setúbal", "addressCountry": "PT" },
      "areaServed": { "@type": "Country", "name": "Portugal" },
      "identifier": { "@type": "PropertyValue", "propertyID": "RNAAT", "value": "nº 31/2023" },
      "sameAs": [
        "https://www.instagram.com/yesexperiencesportugal",
        "https://www.facebook.com/yesexperiencesportugal",
        "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://yesexperiencesportugal.com/#website",
      "url": "https://yesexperiencesportugal.com/",
      "name": "YES Experiences Portugal",
      "inLanguage": "en",
      "publisher": { "@id": "https://yesexperiencesportugal.com/#organization" }
    }
  ]
}
```

### Insertion point

Already emitted from `src/routes/__root.tsx` via `scripts: [jsonLdScript(organizationLd()), jsonLdScript(websiteLd())]`. No new insertion needed. Change is contained in `src/lib/jsonld.ts`.

### Risk / validation concerns

- Rating in `aggregateRating`: currently added via `withAggregateAndReviews`. Only include on pages where the rating is visibly displayed. Confirm homepage doesn't attach `aggregateRating` to the Organization node — spot-check: current `organizationLd()` doesn't set `aggregateRating`. Good.
- `sameAs`: only include URLs that actually resolve. Verify TripAdvisor + Instagram + Facebook + Google Business Profile URLs live before shipping. LinkedIn (founder) is on the Person node, not Organization — keep separate.
- `founder` + `employee` reference `about#nidia-almeida` — confirm `/about` renders that anchor.

Complexity: 1 hr. No visual impact.

---

## 9) Tour pages Service + Offer schema

### Current state

`tourProductLd()` in `src/lib/jsonld.ts` already emits `["Product", "TouristTrip"]` with `image`, `url`, `provider`, `duration` (ISO 8601), `itinerary` (ItemList of stops), `offers` (Offer with price + currency), `brand`. `withAggregateAndReviews()` layers `aggregateRating` + `review[]` when Viator data exists. Used by `/tours/$id`, `/wine-tours-lisbon`, `/arrabida-wine-tour`, `/portugal-wine-tours` (via `productLd`), etc.

### Recommendation

Keep the current `Product + TouristTrip` pattern — it validates cleanly in Google Rich Results Test and covers everything the brief asks for. The user's brief mentions "Service + Offer as conservative default" — that's a valid alternative, but `Product` matches how Google actually surfaces bookable experiences today (Product rich results, price snippets). Not switching unless user prefers the conservative form.

### Priority order

1. `/tours/arrabida-wine-allinclusive` (best-seller — highest ranking upside)
2. `/arrabida-wine-tour` (SEO landing hub)
3. `/tours/azeitao-cheese`
4. `/tours/sintra-cascais`
5. `/portugal-wine-tours`
6. `/wine-tours-lisbon`

All 6 already have schema. Work is **verification, not addition**:
- Confirm each page passes Google Rich Results Test.
- Confirm `aggregateRating` is only emitted when the rating and review count are visibly rendered on that URL. `withAggregateAndReviews()` gates on presence of Viator data — verify the same data is displayed in a review widget on the page. If not, strip `aggregateRating` from that page's LD only.

### Sample JSON-LD (Arrábida all-inclusive, with only visible-on-page fields)

```json
{
  "@context": "https://schema.org",
  "@type": ["Product", "TouristTrip"],
  "@id": "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive#product",
  "name": "Arrábida Private Wine Tour — All-Inclusive",
  "description": "Private day from Lisbon into the Arrábida Natural Park — three family cellars in Azeitão, cliff-top viewpoints, slow lunch.",
  "image": "https://yesexperiencesportugal.com/assets/tours/arrabida-wine-allinclusive/hero.jpg",
  "url": "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
  "brand": { "@id": "https://yesexperiencesportugal.com/#organization" },
  "provider": { "@id": "https://yesexperiencesportugal.com/#organization" },
  "category": "Private day tour",
  "duration": "PT8H",
  "touristType": "Wine and slow-travel lovers",
  "itinerary": {
    "@type": "ItemList",
    "numberOfItems": 4,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "item": { "@type": "TouristAttraction", "name": "Casa Ermelinda Freitas" }},
      { "@type": "ListItem", "position": 2, "item": { "@type": "TouristAttraction", "name": "José Maria da Fonseca cellars" }},
      { "@type": "ListItem", "position": 3, "item": { "@type": "TouristAttraction", "name": "Cliff-top Arrábida viewpoint" }},
      { "@type": "ListItem", "position": 4, "item": { "@type": "TouristAttraction", "name": "Slow lunch at a family winery" }}
    ]
  },
  "offers": {
    "@type": "Offer",
    "url": "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
    "priceCurrency": "EUR",
    "price": "195",
    "availability": "https://schema.org/InStock",
    "seller": { "@id": "https://yesexperiencesportugal.com/#organization" }
  }
}
```
(`aggregateRating` only when Viator meta is present AND a review widget is rendered.)

### Reusable pattern

Already the pattern: `tourProductLd()` + `withAggregateAndReviews()` in `src/lib/jsonld.ts` + `src/lib/aggregate-review-schema.ts`. Call from each route's `head().scripts`. No new abstraction needed.

Affected files: `src/lib/jsonld.ts` (only if we tighten `aggregateRating` gating), 6 route files (verification only).

Complexity: 2–3 hrs (mostly Rich Results Test verification per page). Risk: low.

---

## 10) Local Stories Article + BreadcrumbList schema

### Current state

`localStoryArticleLd()` in `src/lib/jsonld.ts` already emits `BlogPosting` with `headline`, `description`, `mainEntityOfPage`, `url`, `image`, `datePublished`, `dateModified` (falls back to `datePublished`), `inLanguage: "en"`, `author` (Person, defaults to Nidia Almeida), `publisher` (Organization). Emitted from `local-stories.$slug.tsx` head builder for both static articles and DB-backed posts.

`LOCAL_STORIES_ARTICLES` in `src/content/local-stories-articles.ts` has `datePublished` on every article (all `2026-06-XX` dates from seeding) and optional `dateModified`.

### Findings

| # | Field | Status |
|---|---|---|
| 10a | headline | ✅ from `article.title` |
| 10b | description | ✅ from `article.metaDescription` |
| 10c | author | ✅ Nidia Almeida Person node (`FOUNDER_ID`) |
| 10d | publisher | ✅ Organization ref |
| 10e | datePublished | ✅ every article |
| 10f | dateModified | ⚠️ optional and rarely set. Falls back to datePublished — that's fine for schema validation but freezes the freshness signal. Recommend: add a real `dateModified` on each article and bump it whenever the body changes; failing that, set it to the deploy date programmatically. **Do not invent dates.** | 
| 10g | image | ✅ via `articleImageUrl(article)` — absolute URL |
| 10h | article URL | ✅ `SITE_URL + /local-stories/{slug}` |
| 10i | breadcrumb | ⚠️ not emitted per-article. Only `Product`/`Service` pages carry `BreadcrumbList`. Add a 3-crumb `BreadcrumbList` (`Home › Local Stories › {title}`) to every article. |
| 10j | language | ✅ `inLanguage: "en"` |

### Recommended reusable pattern

```ts
// Already the pattern; just add BreadcrumbList alongside BlogPosting:
scripts: [
  jsonLdScript(localStoryArticleLd({ ...article, imageUrl, dateModified: article.dateModified ?? article.datePublished })),
  jsonLdScript(breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "Local Stories", path: "/local-stories" },
    { name: article.title, path: `/local-stories/${article.slug}` },
  ])),
  ...reviewScripts,
]
```

### Sample JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Best Wine Regions Near Lisbon",
  "description": "Which wine regions to visit from Lisbon — Setúbal, Alentejo, Tejo and Bairrada compared by a local. Distances, best cellars, when to go.",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://yesexperiencesportugal.com/local-stories/best-wine-regions-near-lisbon" },
  "url": "https://yesexperiencesportugal.com/local-stories/best-wine-regions-near-lisbon",
  "image": ["https://yesexperiencesportugal.com/assets/local-stories/best-wine-regions.jpg"],
  "datePublished": "2026-06-11",
  "dateModified": "2026-06-11",
  "inLanguage": "en",
  "author": { "@type": "Person", "@id": "https://yesexperiencesportugal.com/about#nidia-almeida", "name": "Nidia Almeida", "url": "https://yesexperiencesportugal.com/about" },
  "publisher": {
    "@type": "Organization",
    "@id": "https://yesexperiencesportugal.com/#organization",
    "name": "YES Experiences Portugal",
    "url": "https://yesexperiencesportugal.com",
    "logo": { "@type": "ImageObject", "url": "https://yesexperiencesportugal.com/brand/png/yes-experiences-portugal-centered-full@2x.png" }
  }
}
```

Affected files: `src/routes/local-stories.$slug.tsx` (add BreadcrumbList), optional `src/content/local-stories-articles.ts` (add real `dateModified` values). Complexity: 1 hr. Risk: low.

---

## 11) Search Console reindexation checklist (post-fix)

### Ordered checklist

1. **Resubmit sitemap** — Search Console → Sitemaps → submit `https://yesexperiencesportugal.com/sitemap.xml`. Confirm status = Success.
2. **Remove stale URL** — Removals → New request → temporary remove `https://yesexperiencesportugal.com/local-stories/%24slug`. Expected outcome: URL hidden from SERPs within hours; permanent removal happens via the 301 already deployed.
3. **URL inspection + Request indexing** on each priority URL (see priority list below). For each: click "Test live URL", confirm it's crawlable + indexable + returns 200 + shows updated `<title>` and rich-results eligibility → click "Request indexing".
4. **Rich Results Test** (https://search.google.com/test/rich-results) on each schema-carrying URL: verify Product, BlogPosting, Organization, BreadcrumbList, FAQPage detected with 0 errors, 0 warnings.
5. **Verify canonical + og:image update** via https://www.opengraph.xyz + LinkedIn Post Inspector + Facebook Sharing Debugger (click "Scrape Again") for each priority URL.
6. **Confirm `/local-stories/%24slug` is gone** — 24–48 h after step 2, run `site:yesexperiencesportugal.com inurl:%24slug` in Google. Expected: 0 results.
7. **Track Coverage report weekly** — Search Console → Pages → confirm "Not indexed" count is trending down and no new "Duplicate" or "Excluded by 'noindex'" spikes.
8. **Monitor Search Console Performance** for the priority URLs — impressions should recover within 2–4 weeks of reindex; CTR should improve immediately when the new titles/descriptions replace the old ones in SERPs.

### URL priority list (in indexing-request order)

**P0** (request indexing immediately):
1. `/`
2. `/tours/arrabida-wine-allinclusive`
3. `/arrabida-wine-tour`
4. `/wine-tours-lisbon`
5. `/portugal-wine-tours`
6. `/multi-day`
7. `/studio-v3`

**P1** (request within 24 h):
8. `/about`
9. `/corporate`
10. `/tours/azeitao-cheese`
11. `/tours/sintra-cascais`
12. `/tours/southwest-vicentine-coast`
13. `/tours/troia-comporta`
14. `/tours/roman-heritage-alentejo`
15. `/local-stories/best-wine-regions-near-lisbon`
16. `/local-stories` (hub)

**P2** (batch resubmit via sitemap only, no manual request):
17. Remaining `/tours/{id}` (7 URLs)
18. Remaining `/local-stories/{slug}` (~9 URLs)
19. `/day-trips-from-lisbon`, `/sintra-day-tour-from-lisbon`, `/alentejo-wine-tour-from-lisbon`, `/evora-alentejo-wine-tour`, `/evora-private-tour-from-lisbon`, `/arrabida-day-trip-from-lisbon`, `/private-wine-tour-lisbon`
20. `/contact`, `/press`, `/reviews`, `/faq`, `/moments`, `/proposal-in-portugal`, `/experiences`, `/day-tours`

### Validation tools

- **Google Search Console** — URL Inspection, Sitemaps, Removals, Coverage, Performance
- **Rich Results Test** — schema validation per URL
- **Schema Markup Validator** (validator.schema.org) — deeper JSON-LD debugging
- **PageSpeed Insights / Lighthouse SEO** — per-page audit
- **Bing Webmaster Tools** — mirror sitemap submission
- **Facebook Sharing Debugger + LinkedIn Post Inspector + opengraph.xyz** — force refresh of cached previews after `og:title`/`og:image` changes

### Expected outcomes per step

| Step | Signal | Timeline |
|---|---|---|
| 1 | Sitemap "Success" + discovered URL count matches | Same day |
| 2 | `%24slug` URL flagged as removed | Same day |
| 3 | "URL is on Google" for each priority URL | 1–7 days |
| 4 | 0 errors / 0 warnings per schema block | Same day |
| 5 | New title/description/image visible in preview debuggers | Immediate after "Scrape again" |
| 6 | 0 results for the `inurl:%24slug` query | 24–48 h |
| 7 | Coverage report improves week-over-week | 1–4 weeks |
| 8 | Impressions + CTR improve for priority URLs | 2–8 weeks |

Complexity: purely operational, no code changes. Owner: whoever holds the Search Console account. 30–60 min to run steps 1–6, then weekly monitoring.

---

## Implementation order across §6–§10 (safest → riskiest)

1. **§6a-b, §6f-i, §6k, §6n, §6o** — sitemap/robots/noindex/meta cleanups (1–2 hrs, low risk)
2. **§10** — add `BreadcrumbList` to Local Stories articles; audit `dateModified` values (1 hr)
3. **§8** — decide TravelAgency vs Organization (ask user); tighten `sameAs` list to only-live URLs (30 min)
4. **§9** — verify Product schema on 6 priority tour pages via Rich Results Test; tighten `aggregateRating` gating if needed (2–3 hrs)
5. **§7** — 10 meta title/description swaps + optional `seoTitle` field on `SignatureTour` (1–2 hrs)
6. **§6e** — `best-day-trips-from-lisbon` 301 (5 min)
7. **§6c** — `/portugal-travel-designer` → `/multi-day` consolidation — **awaits user approval**
8. **§11** — reindexation checklist run — **only after 1–7 are deployed**

No redesigns. No brand token changes. No content invented.

## Open questions before implementation

- **Q1 (§6c):** OK to 301 `/portugal-travel-designer` → `/multi-day` and drop it from the sitemap? Both currently rank; consolidating funnels authority to one.
- **Q2 (§8):** Downgrade Organization schema from `["TravelAgency", "LocalBusiness"]` to `["Organization", "LocalBusiness"]` per the conservative brief, or keep `TravelAgency` (RNAAT nº 31/2023 legally supports it)?
- **Q3 (§7):** OK to add `seoTitle` / `seoDescription` fields to `SignatureTour` so `/tours/{id}` heads can override the auto-built title on the top 4 SEO focus tours?
- **Q4 (§10):** OK to set `dateModified = today` (build-time) on Local Stories articles that lack an explicit value, or should we leave them frozen at `datePublished`?
- **Q5 (§6l):** Should `/reviews` stay indexable, or drop from sitemap if it's just a Trustpilot widget?

Ready to execute in the listed order once you approve — or say "skip Q1–Q5 defaults" and I'll use: Q1 = yes, Q2 = keep TravelAgency, Q3 = yes, Q4 = leave frozen (don't invent dates), Q5 = drop from sitemap.
