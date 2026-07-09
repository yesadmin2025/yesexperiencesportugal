# Local Stories placeholder / redirect-loop audit

## Where the placeholder route is generated

- Route file: `src/routes/local-stories.$slug.tsx` — declares `createFileRoute("/local-stories/$slug")`.
- URL `/local-stories/%24slug` decodes to `/local-stories/$slug`, which matches this dynamic route with `params.slug === "$slug"`.
- `beforeLoad` (lines 278–293) currently detects placeholder slugs (`""`, `"slug"`, `"undefined"`, `"null"`, `"example"`, anything starting with `$`) and throws `redirect({ to: "/local-stories", statusCode: 301 })`.
- The listing at `/local-stories` (`src/routes/local-stories.tsx`) links to real articles only. Static articles come from `LOCAL_STORIES_ARTICLES` (all real slugs); DB posts come from `journal_posts` (Supabase). No source of a literal `"$slug"` `<Link>` today.

## Why Search Console / crawlers report a redirect loop

- The placeholder URL is being served with a **301 → `/local-stories`** every time. Google flags URLs that always redirect to a page which itself lists/links back to the same URL family as loop-like, and the URL stays in the index because `301` says "moved permanently, keep tracking it" — not "gone".
- Google's discovery of `%24slug` almost certainly came from an earlier build that shipped a `<Link to="/local-stories/$slug">` without `params` (Tailwind/TanStack renders that literally). The current listing no longer emits that link, but the indexed URL persists and every crawl still returns 301 → 200 with the same discovered path in history, producing the loop signal.
- Secondary risk: the 301 handler runs in `beforeLoad`. If SSR ever calls `/local-stories/$slug` (e.g. from prerender or a stray internal link) it will 301 to the listing, and any residual link back to `/$slug` restarts the cycle. A soft-404 served as 301 also prevents Google from ever dropping the URL.

## Sitemap / internal links / canonical

- **Sitemap** (`src/routes/sitemap[.]xml.ts` lines 84–115): iterates `LOCAL_STORIES_ARTICLES` (filters out `best-day-trips-from-lisbon`) and `journal_posts` where `status = 'published'`. The placeholder `$slug` is NOT in the sitemap. No guard against empty/null DB slugs, though — worth hardening.
- **Internal links**: `src/routes/local-stories.tsx` lines 126 and 153 always pass `params={{ slug: a.slug | p.slug }}`. Grep across `src/` and `public/` shows no other reference to `/local-stories/$slug` or `%24slug` outside the route file itself, `routeTree.gen.ts`, JSON-LD builders, and `llms.txt` (which lists real articles only).
- **Canonical**: `head()` in `local-stories.$slug.tsx` only emits `rel="canonical"` when a real article OR DB post exists. On the notFound branch (lines 222–230) it emits `robots: noindex, nofollow` and no canonical — correct. Problem is that `beforeLoad` short-circuits with a 301 before that head ever runs for placeholder slugs.
- **robots.txt**: has no explicit rule for the placeholder path.

## Safest fix

Serve the placeholder as a real 404 (with `noindex, nofollow`), not a 301. This removes the loop signal, tells Google to drop the URL, and preserves the good redirect (`best-day-trips-from-lisbon` → `/day-trips-from-lisbon`).

## Implementation steps (build mode, later)

1. **`src/routes/local-stories.$slug.tsx`** — in `beforeLoad`:
   - Keep the `best-day-trips-from-lisbon` → `/day-trips-from-lisbon` 301 (that's a legitimate content move, single hop, target does not link back).
   - Replace the placeholder-redirect block with `throw notFound()` for the same set (`""`, `"slug"`, `"undefined"`, `"null"`, `"example"`, `startsWith("$")`, plus URL-decoded `%24…` handled implicitly since routing decodes params). The existing `notFoundComponent: NotFoundView` and the noindex-head branch already handle rendering.
   - Optional hardening: also treat slugs that fail a simple `[a-z0-9-]{2,}` regex as `notFound()` — catches other malformed placeholders.

2. **`src/routes/sitemap[.]xml.ts`** — defensively filter `LOCAL_STORIES_ARTICLES` and `journal_posts` results to skip any entry whose slug is empty, null, starts with `$`, or is one of the placeholder tokens above. Prevents a bad DB row from re-introducing the URL.

3. **`public/robots.txt`** — add belt-and-braces:
   - `Disallow: /local-stories/$slug`
   - `Disallow: /local-stories/%24slug`
   Keeps well-behaved crawlers off the placeholder even if it resurfaces.

4. **Verify** after edits:
   - `curl -I` (or Playwright) `/local-stories/%24slug` returns **404** with `<meta name="robots" content="noindex, nofollow">`.
   - `/local-stories/best-day-trips-from-lisbon` still 301s once to `/day-trips-from-lisbon`.
   - `/local-stories/arrabida-vs-sintra` still 200s.
   - `/sitemap.xml` contains only real slugs; no `$slug`.
   - Grep confirms zero `to="/local-stories/$slug"` without a `params` sibling.

## Affected files

- `src/routes/local-stories.$slug.tsx` (beforeLoad change)
- `src/routes/sitemap[.]xml.ts` (defensive filter)
- `public/robots.txt` (two Disallow lines)

## Risk

Low. Changes are additive/defensive:
- Switching 301 → 404 for placeholders is the recommended SEO fix; it does not affect real article URLs or the day-trips redirect.
- Sitemap filter only drops malformed entries that were never valid.
- robots.txt lines are scoped to the placeholder path and do not touch real articles.
- No design, layout, copy, or brand tokens change. No component/UI edits.

## Out of scope

- Local Stories visual design, typography, card layout — untouched.
- Real article routes, DB schema, or content — untouched.
