# SEO landing pages — final plan (Semrush-validated)

All keyword assumptions have been checked against real search volume. The plan below reflects those results — no slug churn on trafficked URLs, no speculative pages.

---

## Semrush results (final)

| Term | Volume | KDI | Verdict |
|---|---|---|---|
| day trips from lisbon | 2,400/mo | — | keep `/day-trips-from-lisbon` as primary |
| private tours from lisbon | 10/mo | — | **skip separate page** — cover as H2 inside `/day-trips-from-lisbon` |
| sintra day tour | 260/mo | — | **keep slug** `/sintra-day-tour-from-lisbon` |
| sintra private tour | 90/mo | — | add "private" to H1/meta only, no rename |
| proposal in portugal | 40/mo | 3 | **new page** `/proposal-in-portugal` + 301 from `/proposals` |
| corporate experiences portugal | no data | — | skip slug rename |
| corporate retreats portugal | 10/mo | 0 | secondary H2 on `/corporate` |
| team building portugal | 40/mo | 10 | **primary H1** on `/corporate` audit pass |
| portugal travel designer | no data | — | ship as positioning pillar, not keyword bet |

---

## Scope (locked)

### 2 new routes
1. **`/portugal-travel-designer`** — new pillar page. No keyword competition; positioning play tied to the "Travel Designer" CTA the Local Stories plan needs.
2. **`/proposal-in-portugal`** — new keyword-targeted slug. 301 from `/proposals`. Copy migrates from existing `/proposals` route.

### 3 audit passes (priority)
1. **`/portugal-wine-tours` + `/private-wine-tour-lisbon`** — add FAQ block (3 Q&As) + FAQPage JSON-LD + Local Stories rail + Studio/Designer CTA parity.
2. **`/corporate`** — H1/meta rewrite around **"team building portugal"** (primary) and **"corporate retreats portugal"** (secondary). No slug change. Add 3 Q&A FAQ + FAQPage schema.
3. **`/sintra-day-tour-from-lisbon`** — keep slug. Add "private" to H1 and meta title to catch both intents. Add 3 Q&A FAQ + Local Stories rail.

### Deferred (light audit only, next pass)
`/private-tours-portugal`, `/arrabida-day-trip-from-lisbon`, `/alentejo-wine-tour-from-lisbon`, `/day-trips-from-lisbon` (add "private tours" H2 section), `/itineraries/10-day-private-portugal-tour`. FAQ + Local Stories rail on each.

### Explicitly skipped
- `/private-tours-from-lisbon` (10/mo — 240× smaller than `/day-trips-from-lisbon`)
- `/corporate-experiences-portugal` slug (no search volume)
- `/sintra-private-tour-from-lisbon` rename (would 301 away from 260/mo term)

---

## Page template (unchanged from prior plan)

```text
Hero → Intro (≤90 words) → Signature cards → How It Works
→ Trust band → FAQ (3 Q&As) → Local Stories rail → Footer CTA pair
```

**Every page ships:** `<title>` <60 chars keyword-first · `<meta description>` <160 chars · self-canonical · CollectionPage + Breadcrumb + FAQPage JSON-LD. Multi-day/Designer pages add Travel Designer CTA; day-trip pages add Studio CTA.

---

## Reused components (zero net new primitives)

`SiteLayout`, `Eyebrow`, `SectionTitle`, `CtaButton`, `EditorialCard`, `jsonLdScript`/`breadcrumbLd`/`faqPageLd` from `src/lib/jsonld.ts`, `<ArticleCTA variant="rail">` from the Local Stories plan, typed Signature slugs from `src/data/signatureTours.ts`.

FAQ content pattern already exists in `src/content/seo-faq.ts` — extend that file with per-page 3-Q&A sets (`WINE_TOURS_FAQ`, `CORPORATE_FAQ`, `SINTRA_FAQ`, `PROPOSAL_FAQ`, `TRAVEL_DESIGNER_FAQ` already there).

---

## Effort

| Task | Effort |
|---|---|
| `/portugal-travel-designer` (new) | ~3–4h |
| `/proposal-in-portugal` (new + 301 from `/proposals`) | ~1.5h |
| Wine audit pass (2 pages) | ~1.5h total |
| `/corporate` H1 rewrite + FAQ | ~1h |
| `/sintra-day-tour-from-lisbon` H1 tweak + FAQ | ~45m |
| Deferred audit passes (5 pages, next batch) | ~4–5h |

**First batch: ~7–8h. Full pass: ~12–15h.**

---

## Launch order (3 pages first)

1. **`/portugal-travel-designer`** — new pillar, unlocks multi-day CTA target.
2. **Wine audit pass** — highest-converting vertical, fastest SEO uplift via FAQPage schema on already-indexed URLs.
3. **`/proposal-in-portugal`** — 40/mo, KDI 3 quick win, replaces the risky Sintra rename slot.

---

## Risk

**Low across the board.** No slug renames on trafficked URLs. `/proposals` → `/proposal-in-portugal` is the only 301, and `/proposals` has no keyword ranking to lose (volume shifted to the new slug). `/corporate` H1 change is copy-only.

---

## Ready to build

Say the word and I'll ship in this order:
1. `/portugal-travel-designer` (new route + JSON-LD + CTA pair)
2. Wine audit pass (FAQ block + FAQPage schema + Local Stories rail on both pages)
3. `/proposal-in-portugal` (new route + 301 + copy migration)

Or pick a different starting page.
