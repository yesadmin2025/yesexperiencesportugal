# YES Experiences Portugal

Premium tourism site for YES Experiences Portugal — Signature tours, the Tailor flow, Studio V3, the Builder, corporate proposals and instant Stripe checkout.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR + prerender) |
| Router | TanStack Router (file-based, `src/routes/`) |
| Build | Vite 7 |
| Runtime / package manager | Bun (`bun.lock`, text lockfile) |
| Styling | Tailwind CSS v4 via `src/styles.css` (`@theme` tokens, no `tailwind.config.js`) |
| Backend | Lovable Cloud (Postgres, auth, storage, edge functions) |
| Payments | Stripe |
| Maps | Leaflet + Mapbox |
| Unit tests | Vitest |
| E2E / visual | Playwright |

Deployment target is an edge worker runtime — server code must be Worker-compatible (no native addons, no child processes).

## Getting started

```bash
bun install
bun run dev        # http://localhost:8080
```

`predev` and `prebuild` run the guard scripts (CSS braces, motion budget, route imports, hero scene IDs, brand audits, hero a11y) before the server or build starts.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server on port 8080 |
| `bun run build` | Production build (`vite build`) |
| `bun run build:dev` | Development-mode build, used to catch prerender failures |
| `bun run test` | Full Vitest suite |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:e2e` | Playwright suite (`bun run test:e2e:install` once, first) |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run brand:audit` | Palette/token audit → `src/generated/brand-audit.json` |
| `bun run brand:audit:site` | Site-wide brand audit |
| `bun run check:routes` | Route import guard |
| `bun run qa:hero-copy` | Hero copy lock check |
| `bun run test:sot-parity` | Signature tours vs. Viator source-of-truth parity |

TypeScript check: `bunx tsgo --noEmit`.

## Project structure

```
src/
  routes/              file-based routes; api/ for server routes, api/public/ bypasses auth
  routes/__root.tsx    root layout, <head> metadata, global providers
  components/          UI (ui/ holds shadcn + canonical primitives)
  lib/                 helpers; *.functions.ts = server functions, *.server.ts = server-only
  config/              single sources of truth (pricing, business NAP, trust certificate)
  content/             editorial copy, SEO FAQ, local stories
  data/                signatureToursSourceOfTruth.ts and related fixed data
  integrations/        generated Lovable Cloud clients — do not edit by hand
  styles.css           Tailwind v4 theme tokens
e2e/                   Playwright specs and visual baselines
scripts/               prebuild guards and audit scripts
docs/                  QA, SEO and audit reports
.github/workflows/     CI (typecheck, prebuild, visual, a11y, checkout gates)
```

There is no `src/App.tsx`, `src/main.tsx` or `src/pages/` — routing is entirely file-based under `src/routes/`.

## Sources of truth

Do not hardcode values that live in these files:

- `src/data/signatureToursSourceOfTruth.ts` — tour stops, inclusions, durations. Never invent stops, partners, prices or itineraries.
- `src/config/pricing.ts` — pricing rules and the direct-booking discount.
- `src/config/business-nap.ts` — legal name, address, phone, licence data.
- `src/config/trust-certificate.ts` — Trustindex rating shown in the footer and in JSON-LD.

Brand tokens (teal, gold, ivory, sand, charcoal) live in `src/styles.css`. Typography is Fraunces (headings) plus Inter (body) only. Never hardcode color utilities in components.

## CI

Every workflow in `.github/workflows/` runs on Bun. Guard suites cover typecheck, prebuild scripts, hero copy/typography/visual locks, homepage structure, builder and Studio V3 regressions, signature map + a11y, pricing SSOT and the checkout gates. Checkout specs are release-blocking.

## Environment

Server secrets are read inside server-function handlers via `process.env`. Browser config uses `import.meta.env.VITE_*`. Cloud credentials in `.env` are generated — do not edit them by hand.
