# Launch-Readiness QA — Audit Report

Audit only. No code changes proposed. Findings verified against the running preview (`localhost:8080`) and source in `src/`.

---

## A. Fully fixed items

1. **Local Stories routing loops resolved.**
   - `GET /local-stories/%24slug` → **404** (clean notFound, `X-Robots-Tag: noindex, nofollow`).
   - `GET /local-stories/$slug` → **307** to `/local-stories/%24slug` → **404**. That is URL normalization by the client, not a loop; terminal status is 404.
   - `beforeLoad` in `src/routes/local-stories.$slug.tsx` throws `notFound()` for `$`-prefixed / placeholder / malformed slugs, blocking soft-404s.
   - Valid slug (`/local-stories/best-day-trips-from-lisbon`) → **200** with article body.
   - Unknown slug (`/local-stories/does-not-exist-xyz`) → **404**.
   - Hub `/local-stories` → **200** and is not served for article paths.
   - `robots.txt` explicitly `Disallow`s `/local-stories/$slug` and `/local-stories/%24slug` as belt-and-braces.

2. **Legacy top-level SEO landers redirect 301** into `/local-stories/<slug>` (10 routes verified in prior turns).

3. **Sitemap hygiene.**
   - `src/routes/sitemap[.]xml.ts` filters placeholder slugs (`$slug`, empty, `undefined`, `null`, `example`) and enforces a slug regex before emitting `/local-stories/<slug>` entries.
   - Excludes `/admin/*`, `/auth`, `/booking-confirmed`, `/brand-qa`, `/builder`, `/checkout`, `/e2e`, `/email`, `/hero-verify`, `/lovable`, `/preview-check`, `/qa`, `/s/`, `/i/`, `/studio-drift`, `/studio-v2`, `/typography-audit`, `/unsubscribe`, and 301-only stubs.
   - Regenerated per-request (dynamic server route, `max-age=3600`), so it cannot go stale between builds.

4. **Staging host de-indexation.**
   - `src/lib/noindex-nonprod-host.ts` allow-lists only the canonical apex + `www`; every other host (including `yesexperiences.customwebsitedesigns.org`, `*.lovable.app`, `id-preview--*.lovable.app`, `localhost`) triggers `Disallow: /` at `/robots.txt` and `X-Robots-Tag: noindex, nofollow` on every other response.
   - Wired in `src/start.ts` request middleware (`noindexNonProdHost`).
   - Unit-tested in `src/__tests__/noindex-nonprod-host.test.ts`.
   - Preview response headers confirmed carrying `x-robots-tag: noindex, nofollow`.
   - Sitemap and all canonicals hard-code `https://yesexperiencesportugal.com`, so the staging host cannot leak into either.

5. **Legal / license wording.**
   - No `RNAVT` string anywhere in `src/` or `public/` (only in the guardrail test asserting its absence).
   - `src/config/business-nap.ts` is single source of truth: `RNAAT nº 31/2023`, `Sesimbra, Portugal`. Guardrail test `src/__tests__/nap-consistency.test.ts` enforces this.
   - No "Lisbon & Sesimbra" / "Lisbon and Sesimbra" as base wording. Only Lisbon reference is the pickup-city sentence in `BASED_IN_LONG` ("pickups from Lisbon, Cascais, Sintra, Sesimbra and Setúbal"), which is correct.

6. **Cancellation policy.**
   - No `48h`/`48 hours`/`48-hour` cancellation strings in code or public assets.
   - `CANCELLATION_SIGNATURE` = "…free cancellation up to 24h before…"; `CANCELLATION_STUDIO` shows final terms before checkout; `CANCELLATION_SHORT` for mixed contexts. `TrustStrip` uses the 24h Signature line.

7. **Forbidden broken text strings.**
   - `rg` for `day.Add`, `Photos Fast Crisp` → 0 hits across `src/` and `public/`.

---

## B. Partially fixed items

1. **Cancellation copy placement near final CTAs.**
   - `TrustStrip` renders on checkout, tour detail, and Signature FinalBookingPanel per the launch-QA checklist (`.lovable/launch-qa.md`).
   - Studio V3 / Tailor final CTA surfaces were **not re-verified in this audit** — they may or may not render `CANCELLATION_STUDIO`/`CANCELLATION_SHORT` adjacent to the final CTA. Needs a manual spot-check.

2. **CTA and checkout smoke.**
   - Static code paths look correct (server functions, redirects, routes resolve). No live click-through smoke was run against Stripe test mode this turn — the launch-QA checklist requires a manual pass (`.lovable/launch-qa.md` "Payments (TEST MODE)").

---

## C. Not fixed items

None identified in this audit. All items that were flagged as fixed in prior turns still verify.

---

## D. Remaining launch blockers

None found by this audit that require code changes.

Two items require **manual/live verification** before shipping (they are checklist items, not code defects):

- **D1.** Manual mobile smoke on 393×588: Signature Reserve, Tailor, checkout entry, WhatsApp `wa.me/351…`, mailto — all fire and open cleanly, sticky CTA doesn't cover WhatsApp FAB or final CTAs. Covered by `.lovable/launch-qa.md`.
- **D2.** Stripe test-mode end-to-end in preview (create → success → cancel), plus dataLayer events (`signature_reserve_click`, `checkout_started`, `payment_success`, `whatsapp_click`, `email_click`) visible in DevTools. Same checklist.

---

## E. Non-blocking improvements

1. **Consider serving a 308 (permanent) for `$slug` → `%24slug` normalization** instead of the current 307, so crawlers treat the mapping as stable. Terminal status is 404 either way, so this is cosmetic.
2. **Sitemap could omit the `Disallow: /local-stories/$slug` belt-and-braces lines in `robots.txt`** now that the route always 404s — kept for safety, no harm.
3. **Studio/Tailor final panels**: audit whether the cancellation micro-line uses `CANCELLATION_STUDIO` (preferred) vs. `CANCELLATION_SHORT`. Copy-only.
4. **Accessibility spot-check** (icon-only aria-labels, focus-visible ring, `prefers-reduced-motion`) is covered by tests but a device pass is worth running.

---

## F. Exact next implementation prompt for each remaining blocker

Only the two manual-verification items remain. Suggested prompts:

- **For D1 (mobile CTA/link smoke)**
  > "Run a mobile 393×588 smoke against the preview: click every primary CTA on `/`, a Signature tour detail, `/studio-v3`, `/checkout/<test-token>`; verify WhatsApp opens `wa.me/351911889992` in a new tab, mailto opens `info@yesexperiencesportugal.com`, sticky CTA does not overlap WhatsApp FAB or final CTAs. Report any failing target with screenshot."

- **For D2 (Stripe test-mode + analytics)**
  > "Run a Stripe test-mode checkout end-to-end on the preview: complete a Signature booking, confirm `payment_success` fires in `dataLayer`, then repeat and cancel to confirm return with draft data intact. Also confirm `signature_reserve_click`, `signature_tailor_click`, `checkout_started`, `whatsapp_click`, `email_click` fire in DevTools. Report any missing event."

- **For B1 (cancellation near Studio/Tailor final CTA)**
  > "Audit Studio V3 final step and `tours/$tourId/tailor` final CTA: confirm `CANCELLATION_STUDIO` or `CANCELLATION_SHORT` from `@/config/business-nap` renders within the final panel; if missing, add it above the CTA using existing typography tokens. No new copy — reuse the constants."

---

## G. Final verdict

**Ready to launch after minor fixes.**

All hard code blockers are resolved: routing loops fixed, staging host is de-indexed, sitemap/canonicals are clean, legal/RNAAT/Sesimbra wording is consistent, 24h cancellation is enforced, no broken concatenated strings. The only remaining gates are the two manual verification passes (D1, D2) plus the cancellation-copy-placement spot-check (B1) — none require architectural change.
