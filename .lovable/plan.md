# Local Stories routing audit

## 1. Do invalid Local Stories routes exist / are they reachable?

Yes — reachable, but **not linked or indexed**. The dynamic route
`/local-stories/$slug` (file `src/routes/local-stories.$slug.tsx`)
accepts **any** string, including:

- `/local-stories/$slug` (literal `$` — captured verbatim as
  `params.slug === "$slug"`)
- `/local-stories/%24slug` (URL-encoded `$` — decoded to the same
  `params.slug === "$slug"`)
- `/local-stories/anything-else` (typos, deleted posts, malicious probes)
- template placeholders like `/local-stories/example`,
  `/local-stories/undefined`

For all of these:

- The **loader does not throw `notFound()`** — it returns
  `{ reviews: [], signatureTitle: null, dbPost: null }` when the slug
  is neither a static article (`getLocalStoryArticle`) nor a
  `published` DB row (`journal_posts` via `fetchPost`). Lines 106 and
  121 in `local-stories.$slug.tsx`.
- The **component then re-fetches** the same missing slug in
  `DbPostView` via `useQuery`, shows a "Loading…" screen, and only
  then throws `notFound()` (line 500–502) once the second fetch
  resolves.
- Result: HTTP **200 OK** with a brief "Loading…" flash, then the
  `NotFoundView` UI at the same URL. This is a **soft-404**: Google
  sees 200 + generic "Local Story — YES experiences Portugal"
  metadata + a canonical pointing at the invalid URL (`head()`
  fallback at lines 210–274). The `notFoundComponent` swap does not
  change the status code, and no `robots: noindex` is emitted for
  missing slugs.
- The `beforeLoad` at line 277 only handles the one legacy redirect
  (`best-day-trips-from-lisbon → /day-trips-from-lisbon`); it does
  not guard placeholder patterns.

Two dedicated legacy/SEO routes exist alongside this and are fine:
`/day-trips-from-lisbon` and `/evora-alentejo-wine-tour`. The
day-trips redirect from the dynamic route is correct.

## 2. Where invalid URLs could be generated

Checked every source of `/local-stories/…` URLs; **no** placeholder
or invalid slug is generated internally:

| Source | File | Behavior |
|---|---|---|
| Sitemap — static | `src/routes/sitemap[.]xml.ts:125–132` | Iterates `LOCAL_STORIES_ARTICLES`, excludes `best-day-trips-from-lisbon` (moved to its own SEO route). All real. |
| Sitemap — DB | `src/routes/sitemap[.]xml.ts:135–151` | `journal_posts` filtered by `status = "published"`. Dedupes against static slugs (lines 153–156). Draft/unpublished never appear. |
| Sitemap resilience | 149–151 | Tolerates DB failure; only ships static entries. Safe. |
| Index page — static grid | `src/routes/local-stories.tsx:115–141` | Maps `LOCAL_STORIES_ARTICLES` only. Uses typed `<Link to="/local-stories/$slug" params={{ slug: a.slug }}>`, so no string interpolation. |
| Index page — DB grid | `src/routes/local-stories.tsx:142–170` | Maps `posts` from the same published-only query. |
| Footer / Navbar | `src/components/Footer.tsx:95`, `Navbar.tsx:26` | Only link the index `/local-stories`, not `$slug`. |
| `public/llms.txt` | lines 17–26 | Hand-maintained; all 6 URLs are real published articles. |
| JSON-LD | `src/lib/jsonld.ts:725` | Only references the index for reviews `@id`. No per-slug URLs. |
| `beforeLoad` redirect | `local-stories.$slug.tsx:277–283` | Redirects one legacy slug. Does not manufacture URLs. |

Nothing in the codebase links `/local-stories/$slug` literally,
`%24slug`, `undefined`, `null`, an empty slug, or any template
placeholder. The only way to reach an invalid route is by typing it,
following a stale external link, or a crawler probe.

## 3. Sitemap / internal-link exposure

- **Sitemap**: clean. Only `LOCAL_STORIES_ARTICLES` (minus the moved
  day-trips one) and `journal_posts` where `status = 'published'`.
- **Internal links**: clean. Both grids on `/local-stories` use
  typed `<Link>` with `params={{ slug: a.slug }}` sourced from the
  same two allow-lists.
- **External surfaces** (`llms.txt`, JSON-LD): clean.
- **`robots.txt`**: currently no rule for `/local-stories/*` — not
  needed, because indexed URLs come from the sitemap and each valid
  slug's `head()` sets its own canonical. Invalid slugs today are
  crawlable but not linked; the risk is if one gets shared or
  crawled it returns 200 (see section 1).

## 4. Safest fix

Turn every invalid slug into a **real 404** (proper `notFound()`
boundary + `noindex`), keep the friendly `NotFoundView` UI, and add a
single guard for the `$slug` / `%24slug` placeholder family so it
redirects to the clean index.

Four small, surgical changes inside
`src/routes/local-stories.$slug.tsx`:

1. **`beforeLoad`** — after the existing day-trips redirect, add a
   guard that redirects obvious placeholders to `/local-stories`
   (single decision point, no crawler cost):

   ```ts
   const bad = new Set(["$slug", "slug", "undefined", "null", "example", ""]);
   const s = params.slug?.trim().toLowerCase();
   if (!s || bad.has(s) || s.startsWith("$")) {
     throw redirect({ to: "/local-stories" });
   }
   ```

2. **`loader`** — when neither `getLocalStoryArticle(slug)` nor
   `fetchPost(slug)` returns a record, `throw notFound()` instead of
   returning the empty `{ reviews: [], signatureTitle: null, dbPost: null }`
   shape. This routes through `notFoundComponent` immediately, no
   double-fetch, no "Loading…" flash.

3. **`head()`** — when `loaderData` is missing (notFound thrown or
   loader errored), return **only** `{ title: "Story not found",
   meta: [{ name: "robots", content: "noindex, nofollow" }] }` — no
   canonical, no og:url pointing at the invalid URL, no BlogPosting
   JSON-LD.

4. **`Page` / `DbPostView`** — remove the client-side `useQuery`
   refetch for the missing case. Since the loader now guarantees a
   DB post exists when `article` is null (else it threw), render
   directly from `loaderData.dbPost`. Delete the `if (!post) throw
   notFound()` fallback at line 500–502 (the loader owns it now).

Net effect:

- Valid static article → unchanged.
- Valid DB post → unchanged (one less client refetch, faster paint).
- `/local-stories/$slug` / `%24slug` / `undefined` → **302 → /local-stories**.
- Any other invalid slug → **404** with `NotFoundView` UI and
  `noindex` in `<head>` (crawlers drop it, no soft-404).

Redirect vs 404 rationale: keep 404 as the default (so legitimate
typos / deleted posts don't quietly disappear from analytics), and
only redirect the small class of placeholder-shaped slugs that are
never a real article.

## 5. Files / routes / components to edit

**Only one file:**

- `src/routes/local-stories.$slug.tsx` — extend `beforeLoad`
  (line 277), tighten `loader` (lines 99–149), tighten `head()`
  fallback branch (lines 210–274), simplify `Page` + `DbPostView`
  (lines 290–302 and 483–502).

**No changes needed** to any of these — verified clean:
`src/routes/local-stories.tsx`, `src/routes/sitemap[.]xml.ts`,
`public/llms.txt`, `public/robots.txt`, `src/components/Footer.tsx`,
`src/components/Navbar.tsx`, `src/lib/jsonld.ts`,
`src/content/local-stories-articles.ts`.

## 6. Risk level

**Low.**

- Behavior change is scoped to slugs that are already broken today
  (currently soft-404 with 200 OK → will become either a clean 302
  or a real 404 with noindex).
- Static articles and real DB posts render through the same code
  path with identical head/JSON-LD/UI output.
- No sitemap, JSON-LD, canonical, or internal-link surface changes.
- The redirect list is conservative (5 exact placeholder strings +
  `startsWith("$")`); no real published slug in
  `LOCAL_STORIES_ARTICLES` or `journal_posts` matches these
  patterns.
- Rollback is trivial (revert one file).

Only real caveat: any legitimate external inbound link to a slug
that was **deleted** from `journal_posts` will now return a hard
404 instead of the current soft-404. That is the desired SEO
behavior (Google will de-index cleanly) and the `NotFoundView`
still offers a "All Local Stories" CTA, but if you'd rather 301
those to `/local-stories`, say so and I'll swap `notFound()` for
`redirect({ to: "/local-stories" })` in the loader's final branch.

**Awaiting approval before I edit anything.**
