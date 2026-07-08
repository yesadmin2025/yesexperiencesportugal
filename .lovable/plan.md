# Local Stories — Article + BreadcrumbList JSON-LD Audit (Plan, no changes)

## 1. Current structure

Two content sources render at `/local-stories/{slug}`:

- **Static SEO articles** — 12 entries in `src/content/local-stories-articles.ts` (typed `LocalStoryArticle`). This is the primary surface.
- **DB posts** — Supabase `journal_posts` fallback for anything not in the static file.

Both branches already emit JSON-LD from `src/routes/local-stories.$slug.tsx`:

- **Static branch** (`articleJsonLd()` local helper) emits `BlogPosting` + `BreadcrumbList` (via `breadcrumbLd`) + `Person` (founder) + optional `FAQPage` + optional review nodes.
- **DB branch** emits inline `BlogPosting` + `BreadcrumbList`.
- Global `WebSite` + `Organization` come from `src/routes/__root.tsx`.

The 12 static article slugs: `best-day-trips-from-lisbon` (redirected to `/day-trips-from-lisbon`), `arrabida-vs-sintra`, `setubal-wine-guide`, `what-to-do-in-sesimbra`, `private-tour-vs-group-tour`, `troia-comporta-guide`, `southwest-vicentine-coast-guide`, `roman-heritage-alentejo-talha-wines`, `is-a-wine-tour-from-lisbon-worth-it`, `best-wine-regions-near-lisbon`, `arrabida-vs-alentejo`, `best-wineries-near-lisbon`.

## 2. Field availability (against your requested schema)

| Field | Static articles | DB posts |
|---|---|---|
| `headline` | ✅ `h1` | ✅ `title` |
| `description` | ✅ `metaDescription` | ⚠️ `excerpt` (nullable) |
| `author` (org) | ❌ currently Person "Nidia Almeida" | ❌ Person `author_name` or founder |
| `datePublished` | ✅ `datePublished` | ⚠️ `published_at` (nullable) |
| `dateModified` | ❌ falls back to `datePublished` — no dedicated field | ❌ same |
| `image` (main) | ❌ **no `heroImage` field on `LocalStoryArticle`** — omitted from JSON-LD | ✅ `hero_image_url` (nullable) |
| `url` | ✅ | ✅ |
| Breadcrumb | ✅ Home › Local Stories › Article | ✅ same |

**Two real gaps:**
1. Static articles have no hero image field, so `image` is absent from their `BlogPosting` — Google Article rich results require `image`.
2. No `dateModified` distinct from `datePublished` — acceptable now, but every editorial pass should bump it.

Author identity is a policy call, not a gap — see §3.

## 3. Recommended reusable pattern

Move JSON-LD generation into a single reusable helper `localStoryArticleLd()` in `src/lib/jsonld.ts` that both branches call, so static and DB posts cannot drift.

**Type additions** in `LocalStoryArticle`:
- `heroImage: string` (required, absolute or `/…` — helper prepends `BASE`)
- `heroImageAlt: string`
- `dateModified?: string` (fallback to `datePublished`)

**Author policy** — you asked for `author: YES Experiences Portugal` (Organization). Recommended hybrid, matching editorial norms and preserving the existing E-E-A-T signal:
- `author` → **Person** (Nidia Almeida, `@id` = `FOUNDER_ID`) — Google rewards a named human author for travel content.
- `publisher` → **Organization** "YES Experiences Portugal" (already correct).
- If you want strictly org-as-author, the helper accepts an `authorMode: "person" | "organization"` flag; default `"person"`.

**Breadcrumb** stays via existing `breadcrumbLd()` — no changes needed, already correct.

## 4. Sample JSON-LD (one page, e.g. `arrabida-vs-sintra`)

```json
[
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "Arrábida vs Sintra: Which Day Trip Is Right for You?",
    "description": "Arrábida or Sintra from Lisbon? A local's honest comparison — wine country and wild coast vs palaces and forest — to help you choose the right day.",
    "url": "https://yesexperiencesportugal.com/local-stories/arrabida-vs-sintra",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://yesexperiencesportugal.com/local-stories/arrabida-vs-sintra"
    },
    "image": [
      "https://yesexperiencesportugal.com/local-stories/arrabida-vs-sintra/hero.jpg"
    ],
    "datePublished": "2026-06-02",
    "dateModified": "2026-06-02",
    "inLanguage": "en",
    "author": {
      "@type": "Person",
      "@id": "https://yesexperiencesportugal.com/about#founder",
      "name": "Nidia Almeida",
      "url": "https://yesexperiencesportugal.com/about"
    },
    "publisher": {
      "@type": "Organization",
      "@id": "https://yesexperiencesportugal.com/#organization",
      "name": "YES Experiences Portugal",
      "url": "https://yesexperiencesportugal.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yesexperiencesportugal.com/brand/png/yes-experiences-portugal-centered-full@2x.png"
      }
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yesexperiencesportugal.com/" },
      { "@type": "ListItem", "position": 2, "name": "Local Stories", "item": "https://yesexperiencesportugal.com/local-stories" },
      { "@type": "ListItem", "position": 3, "name": "Arrábida vs Sintra: Which Day Trip Is Right for You?", "item": "https://yesexperiencesportugal.com/local-stories/arrabida-vs-sintra" }
    ]
  }
]
```

## 5. Files / components to edit

1. `src/content/local-stories-articles.ts` — add `heroImage` + `heroImageAlt` (required) and optional `dateModified` to type; fill all 11 live entries. Skip the redirected `best-day-trips-from-lisbon`.
2. `src/lib/jsonld.ts` — add `localStoryArticleLd({ article, url })` (and DB variant `localStoryPostLd`), reused by both branches.
3. `src/routes/local-stories.$slug.tsx` — delete local `articleJsonLd()`; call the new helper. Add `og:image` + `twitter:image` for static articles (currently only DB branch emits `og:image`). Ensure `image` is also passed to the DB branch when `hero_image_url` is present (already partly done).
4. (Optional) `src/routes/local-stories.tsx` — index `Blog` JSON-LD can add `image` per `blogPost` once heroes exist.
5. Test: extend `src/__tests__/jsonld-per-template.test.ts` (or add a sibling) to assert every static article emits `BlogPosting` with `image`, `datePublished`, `author`, `publisher`, and a matching `BreadcrumbList`.

## 6. Risk

**Low.** Pure additive metadata + one helper refactor. No routing, no data-fetching, no UI changes. Only failure mode is missing `heroImage` values — enforced by making the field required in the TS type so the build fails until every article has one.

**Blocker before I code:** I need the 11 hero image URLs (or approval to reuse each article's matching Signature tour hero as a fallback). Once you confirm the image source and the author policy (Person Nidia vs Organization YES), I'll ship it.
