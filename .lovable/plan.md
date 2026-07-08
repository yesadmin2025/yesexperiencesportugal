# SEO landing pages — plan (audit + gap-fill, not greenfield)

Honest headline before anything else: **9 of your 11 requested pages already exist as routes.** The high-leverage work isn't creating 11 new pages — it's auditing the 9 that ship today, filling 2 real gaps, and adding the FAQ + JSON-LD + Local Stories internal-linking layer that was requested but is missing on most of them. Semrush routing is available if you want me to validate keyword volumes per market before we commit copy — say the word.

---

## 1. What already exists vs what's missing

| Requested landing                    | Existing route (if any)                                       | State                                                |
| ------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| Private Tours Portugal               | `/private-tours-portugal`                                     | ✅ ships (189 lines, CollectionPage JSON-LD, no FAQ)  |
| Private Tours from Lisbon            | *(closest: `/day-trips-from-lisbon`)*                         | ⚠️ different intent — needs its own route            |
| Portugal Wine Tours                  | `/portugal-wine-tours`                                        | ✅ ships (190 lines)                                  |
| Private Wine Tour Lisbon             | `/private-wine-tour-lisbon`                                   | ✅ ships                                              |
| Arrábida Day Trip from Lisbon        | `/arrabida-day-trip-from-lisbon`                              | ✅ ships (292 lines)                                  |
| Sintra Private Tour from Lisbon      | `/sintra-day-tour-from-lisbon`                                | ✅ ships (330 lines) — slug says "day", intent is fine |
| Alentejo Wine Tour from Lisbon       | `/alentejo-wine-tour-from-lisbon`                             | ✅ ships                                              |
| Portugal Travel Designer             | —                                                             | ❌ **missing — create**                              |
| 10-Day Private Portugal Tour         | `/itineraries/10-day-private-portugal-tour`                   | ✅ ships                                              |
| Proposal in Portugal                 | *(closest: `/proposals`)*                                     | ⚠️ generic route, no keyword-targeted slug           |
| Corporate Experiences Portugal       | *(closest: `/corporate`)*                                     | ⚠️ generic route, no keyword-targeted slug           |

So the real work is:

- **2 new routes** — `/portugal-travel-designer`, `/private-tours-from-lisbon` (this last one only if it clears an intent test; see below).
- **2 SEO-slug additions** with 301 aliases — `/proposal-in-portugal` → keeps `/proposals` as UX label, `/corporate-experiences-portugal` → keeps `/corporate`.
- **9 audit passes** — each existing page needs the FAQ block + FAQPage JSON-LD + Local Stories internal-linking rail + Studio/Travel Designer CTA parity (most currently have Signature cards but no FAQ and no editorial cross-link).

Before committing "Private Tours from Lisbon" as a separate page, run `semrush--keyword_compare` on `private tours from lisbon` vs `day trips from lisbon` vs `private tours portugal` — if the first two overlap in SERP, one page wins both and we skip creating a duplicate. Doing this before the build is cheaper than fixing cannibalization later.

---

## 2. Reusable components (everything already exists)

The template in `src/routes/private-tours-portugal.tsx` is the canonical shape. Reuse:

- `SiteLayout` — nav + footer shell.
- `Eyebrow`, `SectionTitle`, `CtaButton`, `EditorialCard` (from `mem://design/canonical-primitives.md` + `editorial-card.md`) — locked H1/H2 rhythm.
- `jsonLdScript`, `breadcrumbLd` from `src/lib/jsonld.ts` — already handles CollectionPage + Breadcrumb; extend the file with one `faqPageLd(items)` helper (it already has `faqPageLd` used by Local Stories — reuse).
- Signature card grid + "See tour" link, same shape as Local Stories.
- `<Link>` deep-links against typed Signature slugs from `src/data/signatureTours.ts`.
- `<ArticleCTA variant="rail">` (from the previous Local Stories plan) — same primitive for the "Design in Studio · Talk to a designer" pair.

No new components needed. **Zero net new primitives.**

---

## 3. Suggested URL slugs

Rule: match the exact-match keyword when the SERP rewards it, preserve existing published URLs, avoid slug churn (301 redirects are lossy).

| Page                             | Slug                                             | Notes                                                                                        |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Private Tours Portugal           | `/private-tours-portugal`                         | keep                                                                                         |
| Private Tours from Lisbon        | `/private-tours-from-lisbon` (conditional)        | only if keyword_compare shows non-overlap with `/day-trips-from-lisbon`                      |
| Portugal Wine Tours              | `/portugal-wine-tours`                            | keep                                                                                         |
| Private Wine Tour Lisbon         | `/private-wine-tour-lisbon`                       | keep                                                                                         |
| Arrábida Day Trip from Lisbon    | `/arrabida-day-trip-from-lisbon`                  | keep                                                                                         |
| Sintra Private Tour from Lisbon  | `/sintra-private-tour-from-lisbon`                | **rename from `/sintra-day-tour-from-lisbon`**; 301 the old slug; matches user's target term |
| Alentejo Wine Tour from Lisbon   | `/alentejo-wine-tour-from-lisbon`                 | keep                                                                                         |
| Portugal Travel Designer         | `/portugal-travel-designer`                       | new                                                                                          |
| 10-Day Private Portugal Tour     | `/itineraries/10-day-private-portugal-tour`       | keep — the `/itineraries/` prefix is SEO-neutral and scales for future multi-day pages       |
| Proposal in Portugal             | `/proposal-in-portugal`                           | new; 301 from `/proposals` OR keep `/proposals` as sibling — see risk note below              |
| Corporate Experiences Portugal   | `/corporate-experiences-portugal`                 | new; 301 from `/corporate` OR keep both — same trade-off                                     |

On `/proposals` and `/corporate`: those slugs already have some link equity and are used internally in the nav. Safer path: **create the keyword-rich slug as the canonical URL, make the old slug 301-redirect to it, update Navbar/Footer/internal links in the same PR.** Handled by the existing redirect infrastructure (`src/routes/admin.redirects-monitor.tsx` implies redirect tooling ships already).

---

## 4. Recommended page template

Based on the existing `/private-tours-portugal` shape, with the 4 additions the requested spec calls for (FAQ, JSON-LD FAQPage, Local Stories rail, Travel Designer CTA where relevant):

```text
┌───────────────────────────────────────────────────────┐
│ 1. HERO                                                │
│    Eyebrow · H1 (exact-match keyword) · standfirst    │
│    Primary CTA: Studio  ·  Secondary CTA: Signature   │
├───────────────────────────────────────────────────────┤
│ 2. INTRO (max 90 words, editorial voice)               │
│    Answer the search intent in one paragraph          │
├───────────────────────────────────────────────────────┤
│ 3. SIGNATURE CARDS (3–4, contextual to keyword)       │
│    Reuses EditorialCard primitive                     │
├───────────────────────────────────────────────────────┤
│ 4. HOW IT WORKS (3-step rail — Studio-friendly)       │
├───────────────────────────────────────────────────────┤
│ 5. TRUST BAND (real reviews, existing component)      │
├───────────────────────────────────────────────────────┤
│ 6. FAQ (5–7 questions, keyword-adjacent)  ← NEW       │
├───────────────────────────────────────────────────────┤
│ 7. LOCAL STORIES RAIL (2–3 relevant articles) ← NEW  │
├───────────────────────────────────────────────────────┤
│ 8. FOOTER CTA PAIR (Studio · Travel Designer)         │
└───────────────────────────────────────────────────────┘
```

**Head / structured data (every page):**

- `<title>` <60 chars, keyword-first
- `<meta description>` <160 chars, benefit + trust cue
- Canonical + og:url self-referencing
- `og:type: "website"`, per-page og:title/description, no og:image unless we generate a real hero (never placeholders)
- JSON-LD stack: `CollectionPage` (or `Service` for `/portugal-travel-designer`, `Event` for proposals) + `BreadcrumbList` + `FAQPage` (from the new FAQ block)
- For itinerary pages: add `TouristTrip` schema

Multi-day + Travel Designer pages get the Travel Designer CTA pair; day-trip pages get the Studio CTA pair. Both patterns exist in the codebase.

---

## 5. Estimated effort per page

Assumes the template is now known and copy is pre-approved.

| Page                                     | Type                         | Effort         |
| ---------------------------------------- | ---------------------------- | -------------- |
| `/portugal-travel-designer` (new)        | New route, new copy          | **M (~3–4h)** — new positioning, needs Signature curation + designer intake copy |
| `/private-tours-from-lisbon` (new, conditional) | New route, template dup | **S (~1.5h)** — clone of existing template with Lisbon-specific copy |
| `/proposal-in-portugal` (new + 301)      | New slug, migrate `/proposals` | **S (~1.5h)** — copy already exists on `/proposals`, mainly slug + redirect |
| `/corporate-experiences-portugal` (new + 301) | New slug, migrate `/corporate` | **S (~1.5h)** — same pattern |
| Audit pass on 9 existing routes           | FAQ + JSON-LD + Local Stories rail + CTA parity | **~30–45 min each = 5–7h total** |
| `/sintra-day-tour-from-lisbon` → `/sintra-private-tour-from-lisbon` rename | slug + 301 + internal link sweep | **S (~1h)** |

**Total: ~15–20 hours of focused work**, spread across ~2 sessions. Cheaper than the 11-new-pages read of the brief.

Effort is dominated by copy, not code. If you feed me the FAQ answers per topic in one dump, I can wire the whole audit pass in a single turn.

---

## 6. Which 3 pages first

Prioritise by **intent commercial value × current gap size × implementation confidence**:

1. **`/portugal-travel-designer` (new).** No existing route, no cannibalization risk, aligns with the "Travel Designer" positioning called out repeatedly in memory. Highest-leverage new page — it opens a whole content pillar and unlocks the multi-day CTA target the Local Stories plan needs. **Ship first.**
2. **Audit pass on `/portugal-wine-tours` + `/private-wine-tour-lisbon` (existing).** Wine is your highest-converting vertical (Signature catalog is wine-heavy) and both pages currently lack FAQ + FAQPage schema — the fastest SEO uplift on already-indexed URLs. Adding FAQPage JSON-LD alone often earns rich results within 1–2 crawl cycles. **Ship second.**
3. **`/sintra-private-tour-from-lisbon` rename + audit (existing).** "Sintra private tour" outranks "Sintra day tour" in commercial intent (private = higher AOV). Slug rename with 301 + FAQ block + Signature deep-link to `sintra-cascais` tour. **Ship third.**

Corporate and Proposals landings come next (slug + 301 + audit); the remaining audits close out the pass; `/private-tours-from-lisbon` only if keyword_compare validates the split.

---

## Open confirmations before coding

1. **Semrush validation.** Want me to run `keyword_compare` on the 4 borderline terms — `private tours from lisbon` vs `day trips from lisbon`, `sintra private tour` vs `sintra day tour`, `proposal in portugal` vs `propose in portugal`, `corporate experiences portugal` vs `team retreats portugal` — before we commit slugs? ~2 tool calls, cheap.
2. **Redirect policy.** For the two rename cases (`/corporate` → `/corporate-experiences-portugal`, `/proposals` → `/proposal-in-portugal`), do you want:
   - (a) 301 old → new, or
   - (b) keep both live with canonical pointing at the keyword-rich slug, or
   - (c) keep the short slugs and just add SEO title/H1 keywords without renaming?
   Recommendation: **(a)** for cleanest link equity.
3. **FAQ authorship.** Do you supply the FAQ answers (5–7 per page × ~11 pages = ~65 Q&As), or do you want me to draft on-voice using the skill's tone rules for you to red-pen?

## Risk

**Low on new pages, medium on renames.** New routes are additive. The two slug renames touch published URLs — needs redirect wiring in the same commit + a Navbar/Footer sweep + a sitemap regen. Existing redirect tooling (`admin.redirects-monitor.tsx`) suggests infra is ready. `/sintra-day-tour-from-lisbon` rename is the highest-risk single change because that page ships 330 lines and likely has real inbound traffic — do a Semrush `page_analysis` on it first to confirm current keywords before renaming, so we don't torch ranked terms.
