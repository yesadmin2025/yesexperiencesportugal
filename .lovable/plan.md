# Canonicalize the Studio entry point on `/studio-v3`

## Audit result — most work is already done

`/studio-v3` is already the canonical Studio route in the shared Navbar (desktop + mobile menu + primary CTA), the Footer's "Experience Studio" link, the sticky mobile bottom bar's "Start Your Experience" button (`src/components/MobileStickyCTA.tsx:287`), and every homepage / signature-tour "Open the Studio" CTA. The `/multi-day` page has **no Studio link at all** — nothing to change there.

Only two user-facing links still point to `/builder`:

1. `src/routes/i.$token.tsx:245` — shared-itinerary page: `href={`/builder?j=${token}`}` on the "Abrir & ajustar no Experience Studio" button.
2. `src/components/builder/v3/AmbientPrologue.tsx:159` — inside Studio v3 itself: `href="/builder?mode=pro"` on the "Skip the film" affordance.

And the `/builder` route (`src/routes/builder.tsx`) is currently a **307** redirect via TanStack's default `redirect()` — needs to be a permanent **301**.

## Changes

### 1. Rewrite the two remaining hrefs to `/studio-v3`

Both are plain `<a href>` inside JSX; only the string changes, no styling touched.

- `src/routes/i.$token.tsx:245`
  `href={`/builder?j=${token}`}` → `href={`/studio-v3?j=${token}`}`
- `src/components/builder/v3/AmbientPrologue.tsx:159`
  `href="/builder?mode=pro"` → `href="/studio-v3?mode=pro"`

Preserving the existing query params (`j`, `mode`) means shared itinerary tokens and pro-mode deep links continue to work — `/studio-v3` is the same underlying Studio and already reads these.

### 2. Convert `/builder` to a permanent 301

`src/routes/builder.tsx` — add `statusCode: 301` to the redirect. Search params still forwarded so any legacy deep link (`/builder?j=…`, `/builder?mode=pro`, `/builder?seed=…`, `/builder?step=3&mood=slow`) keeps working.

```ts
beforeLoad: ({ search }) => {
  throw redirect({
    to: "/studio-v3",
    search: search as Record<string, unknown>,
    statusCode: 301,
  });
},
```

TanStack's `redirect()` supports `statusCode` (default 307) — using 301 tells Google to consolidate all `/builder` link equity onto `/studio-v3`.

### 3. Sweep internal audit lists (no user-visible effect, but keeps audits honest)

Two lists still enumerate `/builder` as a page users can visit. Both are internal QA surfaces — updating them prevents the audits from crawling a redirect.

- `src/routes/typography-audit.tsx:25` — swap `"/builder"` → `"/studio-v3"` (dedupe if `/studio-v3` already listed).
- `src/routes/api/verify-hero.ts:148` — same swap.

Test-fixture strings (`src/__tests__/hero-a11y-axe.test.tsx`, editorial-shadow-stack, per-page-brand-regression) intentionally exercise the `/builder` route file's redirect behavior — leave them.

## What is NOT changing

- No Tailwind classes, no CtaButton variants, no icons, no palette tokens.
- No changes to `MobileStickyCTA.tsx`, `Footer.tsx`, `Navbar.tsx`, `multi-day.tsx`, `index.tsx` — all already correct.
- Module-import paths under `@/components/builder/*` stay (those are file paths, not URLs).
- Sitemap already excludes `/builder`.
- `/multi-day`: no Studio CTA exists on that page today. If the user expects one to be added, that's a separate design decision — flagging, not silently adding one.

## Files touched

1. `src/routes/builder.tsx` — add `statusCode: 301`.
2. `src/routes/i.$token.tsx` — 1-line href swap.
3. `src/components/builder/v3/AmbientPrologue.tsx` — 1-line href swap.
4. `src/routes/typography-audit.tsx` — list entry swap.
5. `src/routes/api/verify-hero.ts` — list entry swap.

## Verification

- `rg -n '"/builder"|to="/builder|href="/builder' src/` returns only test fixtures and comments.
- Playwright: hit `http://localhost:8080/builder` and `/builder?j=demo` with `redirect: 'manual'`; expect status **301** and `location: /studio-v3` (with `?j=demo` preserved).
- Load `/i/<token>` and Studio v3 prologue in the browser; click the two updated buttons; confirm they land on `/studio-v3` with the query intact and no visual change to the button.

## Risk

Very low. Two href string swaps + one status-code addition + two audit-list entries. No component structure, no palette, no styling. The 301 is safe because the same query params are forwarded and `/studio-v3` already handles every legacy param `/builder` accepted.
