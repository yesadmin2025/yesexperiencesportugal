# CI truth + pre-launch audit

## I now have GitHub access — and the CI failures are not code

Connected the GitHub connector and read the real Actions data. What it shows:

- **Every workflow is failing** — all 22, including `typecheck`, `Prebuild checks`, `codespaces.yml`, `required-check-enforcer.yml`.
- **None of them actually run.** Every run completes in **3–20 seconds with zero steps executed and no logs** (`BlobNotFound`). Example: run 30498449326, jobs `tsc --noEmit` and `eslint`, `steps: []`, started 23:06:40, failed 23:06:44.
- This has been true for **every run since at least July 27** — not one green run.
- The repo is **private** and the account (`yesadmin2025`) is on the **free GitHub plan**. Actions is enabled (`allowed_actions: all`), the repo is not disabled or archived.

Meanwhile, locally in this sandbox: **`bunx vitest run` → 146/146 test files pass** and the TypeScript check is **clean**.

**Conclusion:** the red X's are an account-level GitHub Actions blocker — free-plan Actions minutes exhausted or the spending limit sitting at $0 for a private repo — not broken code. No code change can turn those checks green. Jobs that never allocate a runner cannot produce logs, which is exactly the signature here.

### What you need to do (I can't do it from here)

On github.com → **Settings → Billing and licensing**:
1. Check **Actions minutes used** this cycle (free plan = 2,000 min/month for private repos; these 22 workflows with Playwright + Lighthouse burn that fast).
2. Either raise the **spending limit** above $0, upgrade the plan, **or** make the repo public (unlimited Actions minutes for public repos — note the code becomes visible).

Tell me once billing is sorted and I'll re-read the runs and fix whatever genuinely fails.

## Meanwhile — the work I can do now

### Phase 1 — Local CI matrix (substitute for the runners)

Run each of the 22 workflows' commands here and record pass/fail in one table:
prebuild scripts, **production `vite build`** (never exercised by the unit suite), all Playwright suites (hero, homepage, builder canvas, Studio V3, signature map/a11y, sitemap/robots, core web vitals, parity), Lighthouse. Visual-regression misses get triaged into "real regression" vs "stale baseline"; baselines are only re-approved after confirming the render is correct.

Two workflow defects to fix regardless of billing:
- **`.github/workflows/codespaces.yml`** uses `npm install` / `npm run build` / `npm run test` with `cache: 'npm'` — this project is Bun with a text `bun.lock` and no `package-lock.json`. It will fail even after billing is fixed. Convert to `oven-sh/setup-bun` + `bun install --frozen-lockfile`.
- **`README.md`** is the untouched starter template: `npm run setup`, `npm run type-check`, `src/main.tsx` / `App.tsx`, `localhost:3000` — none exist here. Rewrite for the real stack before launch.
- **`src/generated/brand-audit.json`** re-emits a `generatedAt` timestamp on every prebuild, producing noise-only diffs on every commit. Make it deterministic.

### Phase 2 — Checkout (zero tolerance, first)

- Stripe live-mode session creation, success + cancel returns, webhook idempotency (duplicate and out-of-order events)
- Price parity: UI total === Stripe line items === booking snapshot, across every Signature, every Tailor adjustment (stop removal −5%, Arrábida lunch removal −€15pp), Studio V3 add-ons, child/adult tiers, and the EUR/USD toggle (display currency must never change the charged amount)
- Snapshot frozen on success; later tour edits must not mutate past bookings
- Failure paths: declined card, abandoned session, network drop mid-redirect, double submit, back-button replay
- Confirmation + admin notification fire exactly once
- All checkout specs green: `checkout-price-parity`, `instant-booking-checkout`, `instant-booking-checkout-negative`, `studio-checkout-gate`, `studio-v3-e6-submit-checkout-idempotency`

Any checkout defect blocks launch outright.

### Phase 3 — Full site audit (mobile 393px first, then tablet/desktop)

1. **Route integrity** — every route renders, no console errors, no dead links; admin/checkout stay `noindex`
2. **Data truth** — Signature pages match `signatureToursSourceOfTruth.ts`; no invented stops/inclusions/prices; map stops resolve for all 11 tours; no duplicate or missing gallery images
3. **Flows** — Studio V3 end-to-end, Tailor, Builder, corporate/proposal enquiry, auth (email, Google, Apple), search
4. **SEO** — canonicals, reciprocal hreflang, sitemap vs live routes, JSON-LD validity; ratings match `trust-certificate.ts`
5. **Performance & a11y** — LCP/CLS/INP on home + a Signature + checkout; axe clean; 4.5:1, 44×44, visible focus, reduced-motion honored
6. **Legal/trust** — consent gating (GA4/GTM Consent Mode v2, Trustindex loader), Livro de Reclamações badge, NAP from `business-nap.ts`

### Phase 4 — Verdict

`docs/launch-readiness-report.md`: local matrix results, checkout evidence (session IDs, snapshot rows, parity numbers), audit findings with resolutions, and a **READY / NOT READY** call. I will not call READY while GitHub Actions is still blocked at the billing level, because there'd be no independent verification of the build.

## Technical notes

- GitHub is now linked to this project (`GITHUB_API_KEY`), so I can re-read runs and logs on demand once runners are unblocked.
- Any Stripe test charge is refunded and noted in the report.
- Brand tokens, Fraunces/Inter typography and approved hero copy are untouched; visual fixes correct code, never the design system.
