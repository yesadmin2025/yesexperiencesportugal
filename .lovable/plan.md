# Fix: /local-stories/[slug] renders hub instead of article

## Root cause

TanStack flat file routing treats `src/routes/local-stories.tsx` as the **parent layout** of `src/routes/local-stories.$slug.tsx`. A parent whose children extend its path MUST render `<Outlet />` for the child route to mount.

`src/routes/local-stories.tsx` does not render `<Outlet />` — it renders the hub `<Page>` body directly. Result: on `/local-stories/<any-slug>`:

- The child route (`local-stories.$slug`) IS matched.
- Its `loader` and `head()` DO run — that is why `<title>` shows the article title.
- Its `component` never mounts, because the parent has nowhere to render it.
- The visible body is always the hub listing.

Verified with `curl` on 5 slugs (`setubal-wine-guide`, `best-wine-regions-near-lisbon`, `arrabida-vs-sintra`, `troia-comporta-guide`, `what-to-do-in-sesimbra`) — all return HTML sourced from `local-stories.tsx:43…` (the hub markup) with the child's `<title>` in `<head>`.

This is not a data / CMS / redirect issue. `getLocalStoryArticle()` correctly returns the article for every listed slug; the sitemap/robots/beforeLoad work fine. It is purely a routing / layout bug.

## All Local Stories slugs

Static (`src/content/local-stories-articles.ts`):

1. `best-day-trips-from-lisbon` — 301 → `/day-trips-from-lisbon` (correct, unaffected)
2. `arrabida-vs-sintra` — broken (renders hub)
3. `setubal-wine-guide` — broken
4. `what-to-do-in-sesimbra` — broken
5. `private-tour-vs-group-tour` — broken
6. `troia-comporta-guide` — broken
7. `southwest-vicentine-coast-guide` — broken
8. `roman-heritage-alentejo-talha-wines` — broken
9. `is-a-wine-tour-from-lisbon-worth-it` — broken
10. `best-wine-regions-near-lisbon` — broken
11. `arrabida-vs-alentejo` — broken
12. `best-wineries-near-lisbon` — broken

Plus any published `journal_posts` rows — same route, same bug, all broken.

Placeholder / unknown slugs — correctly 404 via `beforeLoad` + loader `notFound()` (not affected).

## Safest fix

Convert `local-stories.tsx` into a pure layout that renders `<Outlet />`, and move the hub UI/head/JSON-LD into a new `local-stories.index.tsx` leaf that owns the `/local-stories` URL. This is the pattern documented in `tanstack-route-architecture` for promoting a leaf into a parent layout.

## Implementation steps (build mode, later)

1. **Create `src/routes/local-stories.index.tsx`** — copy the current contents of `src/routes/local-stories.tsx` verbatim, changing only:
   - `createFileRoute("/local-stories")` → `createFileRoute("/local-stories/")`
   - Keep the same `head()`, JSON-LD scripts, `Page` component, `EmptyState`, imports.

2. **Replace `src/routes/local-stories.tsx`** with a minimal layout:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/local-stories")({
     component: () => <Outlet />,
   });
   ```
   No `head()` here — the leaf (`.index`) and the `$slug` child each own their own metadata. A `head()` at the parent would concatenate into every child (previously caused the duplicate-canonical bug already documented in the file's comment).

3. **Let the Router plugin regenerate `src/routeTree.gen.ts`** — do not hand-edit it.

## Verification

- `curl -s /local-stories/setubal-wine-guide | grep 'Setúbal Wine Country'` returns the article's H1 (currently returns hub markup).
- Every slug in the list above renders `StaticArticleView` (or `DbPostView` for DB posts).
- `/local-stories` still renders the hub listing unchanged.
- `/local-stories/%24slug` still 404s (beforeLoad unchanged).
- `/local-stories/best-day-trips-from-lisbon` still 301s to `/day-trips-from-lisbon`.
- No duplicate `<link rel="canonical">` on article pages.

## Affected files

- `src/routes/local-stories.tsx` (rewritten as layout)
- `src/routes/local-stories.index.tsx` (new — old hub body)
- `src/routeTree.gen.ts` (auto-regenerated)

## Risk

Low. Pattern is the canonical TanStack fix for this exact symptom. No design, copy, data, SEO, or brand-token changes. The hub page and article pages keep their existing markup, head(), and JSON-LD. The only behavioural change is that article routes finally render their own component instead of the hub.

## Out of scope

- Local Stories visual design, typography, spacing.
- Article content, sitemap, robots, redirects (already correct).
- DB `journal_posts` schema.
