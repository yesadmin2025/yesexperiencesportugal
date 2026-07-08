# SEO / indexing audit — findings and fixes

Scope: `src/routes/*` (all leaf routes), `src/routes/sitemap[.]xml.ts`, `public/robots.txt`, `__root.tsx` head defaults, per-route `head()` canonical + `og:url` + `robots` metadata, dynamic route not-found behavior, and title uniqueness across SEO landing pages. Verified against localhost.

**Result:** the SEO surface is in strong shape overall. Canonical domain is consistent (`https://yesexperiencesportugal.com`), root `head()` is minimal and doesn't leak canonical/`og:image` overrides to leaves, robots.txt disallows every internal/admin/QA/token/checkout prefix, and the sitemap dynamically resolves signature tours + local-stories articles + DB `journal_posts`. **Two real defects and three optimisations** worth acting on.

---

## Findings

### 1. Soft-404 on invalid `/tours/{slug}` and `/tours/{slug}/tailor` URLs — SOFT-404 SEO LEAK

**Where:**
- `src/routes/tours.$tourId.tsx:44–51` (the `if (!t)` head fallback branch).
- `src/routes/tours.$tourId.tailor.tsx:55–62` (same pattern).

**Current behavior:** loader throws `notFound()`, so `notFoundComponent` renders (correct). But the `head()` fallback still emits:
- A full `<link rel="canonical">` pointing at the invalid URL.
- An `og:url` for the invalid URL.
- No `robots: noindex`.

**Effect:** Google receives a valid-looking canonical for a URL that has no content — a soft-404 that gets indexed with a generic "Signature Experience — YES experiences Portugal" title. Same class of bug that was just fixed on `/local-stories/$slug`.

**Visible?** No to users (they see the not-found page). Yes to crawlers.

**Fix (both files):** in the `if (!t)` branch, return only:
```ts
return {
  meta: [
    { title: "Signature not found — YES experiences Portugal" },
    { name: "robots", content: "noindex, nofollow" },
  ],
};
```
No canonical, no `og:url`, no JSON-LD.

**Risk:** low.

---

### 2. `/tours/{slug}/tailor` is publicly indexable — CANONICAL FIGHT

**Where:** `src/routes/tours.$tourId.tailor.tsx:88`.

**Current:** the tailor route sets `canonical` to the parent Signature URL (`/tours/{slug}`), which is the right consolidation signal, but there is no `robots: noindex`. Google may still index the tailor URL (canonical is a suggestion, not a directive) and it isn't in the sitemap — a mismatch that can trigger "Alternate page with proper canonical tag" or "Duplicate, submitted URL not selected as canonical" in Search Console.

**Effect:** wasted crawl budget on customization URLs; noisy Search Console report.

**Visible?** SEO-only.

**Fix:** add to the valid-tour `head()` meta:
```ts
{ name: "robots", content: "noindex, follow" },
```
Keep the parent canonical and JSON-LD as-is. `follow` lets Google keep discovering links inside the page; `noindex` removes it from SERPs.

**Risk:** low. Tailor is a functional customization surface reached from the parent, not an entry point.

---

### 3. `/e2e/postmessage-probe` has no head metadata — DEFENSE-IN-DEPTH GAP

**Where:** `src/routes/e2e.postmessage-probe.tsx` — no `head()` at all.

**Current:** robots.txt disallows `/e2e`, so compliant crawlers won't fetch it. But since the route inherits the root `robots: index,follow,max-image-preview:large` meta, if any misbehaving crawler or accidental external link surfaces the URL, it advertises itself as indexable.

**Visible?** No.

**Fix:** add a `head()` returning:
```ts
{ meta: [
  { title: "E2E postMessage probe" },
  { name: "robots", content: "noindex, nofollow" },
]}
```

**Risk:** very low.

---

### 4. Keyword-cannibalization risk across four "Portugal tours" SEO landing pages — REVIEW, DO NOT AUTO-FIX

**Where:**
- `/portugal-tours` — "Portugal Tours — Private, Luxury & Small-Group by a Local"
- `/luxury-tours-portugal` — "Luxury Portugal Tours — Private, All-Inclusive, By a Local"
- `/private-tours-portugal` — "Private Tours Portugal — Designed by a Local Operator"
- `/portugal-wine-tours` — "Portugal Wine Tours — Private, By a Local Operator"

All four self-canonical, all four in the sitemap at priority 0.85–0.9, all four target overlapping "portugal tours" head terms. Titles are distinct and content likely differs, but the intent overlap can split ranking signals — Google may pick one and demote the rest.

Same lower-risk pattern on the "wine tour" cluster: `/wine-tours-lisbon`, `/portugal-wine-tours`, `/private-wine-tour-lisbon` (three overlapping wine SEO pages).

**Effect:** potential ranking dilution. Not a technical bug.

**Visible?** SEO-only.

**Recommendation:** DO NOT change anything automatically. Options for you to consider:
- Keep all four and monitor Search Console for cannibalization (impressions dropping, one page eating another's queries).
- Merge two of the weakest into their strongest counterpart with a 301 redirect (e.g. `/luxury-tours-portugal` → `/portugal-tours`, keep as an anchor `#luxury` inside the merged page).
- Differentiate content sharply (each page must answer a genuinely different intent).

**Risk:** medium if left unaddressed long-term; not urgent.

---

### 5. Static article `datePublished` is used as `<lastmod>` — MINOR FRESHNESS SIGNAL

**Where:** `src/routes/sitemap[.]xml.ts:129` — `lastmod: a.datePublished`.

**Current:** static local-stories articles report their original publish date as `lastmod`. Signature tour entries and static page entries report `today`. Inconsistent freshness signalling — Google may deprioritize articles that never appear to update, even if the copy has been revised.

**Effect:** marginal ranking loss for older articles that have been quietly polished.

**Visible?** SEO-only.

**Fix:** either (a) change `lastmod: a.datePublished` to `lastmod: a.dateModified ?? a.datePublished` if the article schema has a modified field, or (b) omit `lastmod` for static articles (crawlers fall back to the last-crawled date, which is honest).

**Risk:** very low.

---

## Sitemap coverage — clean

Every public, indexable route resolves to a sitemap entry:

- **All static landing pages** in the sitemap (28 entries covering home, product hubs, SEO landing pages, terms/privacy/cookies).
- **All Signature tours** enumerated dynamically from `signatureTours` at `/tours/{id}`, with a `SEO_FOCUS_TOUR_IDS` boost for the 4 hero tours.
- **All static local-stories articles** enumerated from `LOCAL_STORIES_ARTICLES`, with `best-day-trips-from-lisbon` correctly excluded (it 301-redirects to `/day-trips-from-lisbon`).
- **All published DB posts** from `journal_posts` where `status = 'published'`, deduped against static slugs.

Correctly excluded (matches robots.txt Disallow set):
`/admin/*`, `/auth`, `/booking-confirmed`, `/brand-qa`, `/builder`, `/checkout/$token`, `/e2e`, `/email`, `/hero-verify`, `/lovable`, `/preview-check`, `/qa.*`, `/review/$token`, `/s/$token`, `/i/$token`, `/studio-drift`, `/studio-v2` (redirect), `/typography-audit`, `/unsubscribe`, `/tours/{id}/tailor` (canonical points to parent).

**No sitemap changes required.** After finding #2, the tailor route stays out of the sitemap (correct) and adds a matching `noindex` (so the alignment is explicit).

---

## Canonical + robots — clean, with the two exceptions above

- Every public leaf route sets its own self-referential `canonical` + `og:url`.
- Root (`__root.tsx`) sets sitewide `robots: index,follow,max-image-preview:large` and does NOT set a canonical or `og:image` — correct (avoids overriding leaves).
- Every internal route (`/admin/*`, `/qa.*`, `/auth`, `/checkout/$token`, `/i/$token`, `/s/$token`, `/review/$token`, `/booking-confirmed`, `/brand-qa`, `/builder`, `/preview-check`, `/hero-verify`, `/typography-audit`, `/unsubscribe`, `/studio-drift`) already emits `robots: noindex`.
- `/local-stories/$slug` correctly emits `noindex` for missing articles (fixed in the previous audit).
- `/studio-v2` is a pure 301 redirect to `/studio-v3` — correct.
- No canonical points at the preview domain (`*.lovable.app`) or the legacy `yesexperiences.pt`; the only refs to those hostnames are in admin dashboards and health probes.
- No duplicate `<title>` across the 11 audited SEO landing pages.

**No canonical changes required outside of findings #1–#3.**

---

## Summary table

| # | Issue | File(s) | Visible? | Fix effort | Risk |
|---|---|---|---|---|---|
| 1 | Invalid tour URLs emit canonical + no noindex | `src/routes/tours.$tourId.tsx` L44–51, `src/routes/tours.$tourId.tailor.tsx` L55–62 | SEO only | ~6 lines each | **Medium** |
| 2 | `/tours/{slug}/tailor` indexable despite canonical to parent | `src/routes/tours.$tourId.tailor.tsx` L70–85 | SEO only | +1 meta line | Low |
| 3 | `/e2e/postmessage-probe` inherits root `index,follow` | `src/routes/e2e.postmessage-probe.tsx` | SEO only | +7 lines | Very low |
| 4 | Keyword cannibalization on "Portugal tours" / "wine tour" clusters | 4 landing pages, 3 wine pages | SEO only | Content review — **NOT auto-fix** | Medium |
| 5 | Article `<lastmod>` frozen at `datePublished` | `src/routes/sitemap[.]xml.ts` L129 | SEO only | 1 line | Very low |

---

## Implementation plan (findings #1, #2, #3 only — awaiting your call on #4 and #5)

### Edit 1 — `src/routes/tours.$tourId.tsx` (lines 43–51)

Replace the invalid-tour head fallback with a noindex-only response:

```ts
const t = loaderData?.tour ?? findTour(params.tourId);
if (!t) {
  return {
    meta: [
      { title: "Signature not found — YES experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  };
}
```

Drop the `og:url` and `canonical` from this branch. Keep the valid-tour branch untouched.

### Edit 2 — `src/routes/tours.$tourId.tailor.tsx` (lines 55–62)

Same pattern for the invalid-tour fallback:

```ts
if (!t) {
  return {
    meta: [
      { title: "Tailor a Signature — YES experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  };
}
```

Additionally, in the valid-tour branch (line ~70), add one meta entry:

```ts
{ name: "robots", content: "noindex, follow" },
```

Keep the parent canonical (line 88) unchanged.

### Edit 3 — `src/routes/e2e.postmessage-probe.tsx`

Add a `head()` to the `createFileRoute` config:

```ts
head: () => ({
  meta: [
    { title: "E2E postMessage probe" },
    { name: "robots", content: "noindex, nofollow" },
  ],
}),
```

### Optional edit 4 — Add `lastmod` freshness (finding #5)

If you want it: swap sitemap line 129 to `lastmod: (a as { dateModified?: string }).dateModified ?? a.datePublished`, provided the article type carries an optional `dateModified`. If it doesn't, either add the field to the article schema or omit `lastmod` for articles.

### No edit for finding #4

Content-strategy decision. Recommend reviewing Search Console cannibalization data over the next 4 weeks before merging or differentiating any of the four "Portugal tours" landing pages.

---

**Overall risk:** low. Findings #1–#3 are surgical head-metadata changes with zero UX or content impact. Finding #4 is a content strategy call you should make deliberately.

**Not modifying anything yet — awaiting your go-ahead.** If you want me to proceed with all three (#1, #2, #3) plus the optional freshness fix (#5), say the word.
