
## Three critical fixes

### 1) Tailored — price mismatch at checkout (€780 shown, €602 charged)

**Root cause.** `/tours/$tourId/tailor` shows an "Indicative total" built purely on the client from `estimatedPrice × guests`. That number ignores the age-band pricing the server applies (children/minors priced below adults). The server-side `booking-quote` returns the real total (€602 for 2 adults + 1 child), so Stripe charges a different amount than the summary card showed. Truth lives on the server; the UI must reflect that.

**Fix.**
- Add a live `fetchBookingQuote` call on the Tailor page (same one already called inside `handleReserve`), keyed on `tour.id + composition + date + startTime + itineraryRevision`, debounced.
- While a quote is pending: keep the current per-pax number but show a subtle "Updating…" state next to the total (already scaffolded).
- When the quote resolves: replace "Indicative total" with the server total (`quote.totals.totalEur`) and show a breakdown line "€X × adults · €Y × children (age N)" when minors are present. Keep `€ / pp` copy only when there are no minors.
- If the quote is unavailable, hide the numeric total and show "Confirmed at checkout" — never invent a number.
- On Reserve: pass the *already-fetched* quote token straight to `createBookingQuoteSession` instead of re-quoting, so what the guest saw is what they pay.
- Preserve the same behavior on the Signature Banded form for parity (it already uses a live quote; verify the summary total shown pre-Stripe equals `quote.totals.totalEur`).

### 2) Signature Experiences page — card copy, review count, density

File: `src/routes/experiences.tsx` (the card renderer at lines ~140–200).

- **Copy.** Replace both "Make it yours" strings with "Tailor this day". Update the `aria-label` to `Tailor ${t.title}`.
- **Reviews.** Read `getViatorMeta(t.id)` for each card and, when present, render a small rating chip on the card: gold star · `rating.toFixed(1)` · `· {reviewCount} reviews` — same treatment used on `/tours/$tourId` (lines 301–316). Position it directly under the title, before the highlight bullets.
- **Density reduction.** The card currently stacks: title, description, up to 3 highlight bullets, meta strip (region · duration · from €X), two CTAs. Trim to:
  - Title
  - New rating chip (when meta exists)
  - One-line description (`line-clamp-2`)
  - Compact meta strip on one line: `region · duration · from €X` (drop the gold dividers on narrow widths; use a middot separator)
  - Remove the highlight bullets from the card (they belong on the detail page). If we want a taste of content, keep at most **one** highlight bullet shown as a subtle italic caption instead of a list.
  - Two CTAs unchanged in position, but shrink to `size="sm"` with tighter padding on mobile so labels never wrap.
- Keep the image treatment, ratio, and hover behavior unchanged.

### 3) Studio V3 — always shows "Signature needs a human touch"

**Root cause hypothesis.** The reveal is gated by `validateResolvedSignature(...)` which requires every `routePoint` to have a non-empty `label` **and** `story`. `routePoints` are built from `journey.moments.slice(0,4)` in `curation.ts` (line 1828). Many resolved moments in production do not carry a `story` string, so `stop-missing-story` triggers on every session and the fallback screen shows. Same class of failure will trigger for any Signature whose moments were composed from the region stop pool where `story` is optional.

**Fix.**
- **Diagnose first (single instrumented run):** log `revealValidation.missing` with `tourId` to Supabase `builder_events` via `recordStudioV3RevealValidation` (already wired) so we can confirm the top failure code across recent sessions. If confirmed as `stop-missing-story`, proceed with the changes below; if a different failure dominates (e.g. `no-skeleton`), address that instead.
- **Loosen the reveal gate to the truthful minimum:** a resolved Signature is valid when it has a matched skeleton tour with an image + title, ≥1 route point with a non-empty label, a `suggestedRouteLabel`, and a `journeyTitle`. Downgrade the `stop-missing-story` and `stop-missing-label` (partial) checks from hard-fails to `warnings` that don't block the reveal — the map + timeline can render from labels alone; `story` is enrichment, not the source of truth.
- **Populate story at composition time so the reveal is richer, not empty:** in `curation.ts` where `routePoints` are built, when `m.story` is falsy fall back to the matched `tour.stops[i].story` (real Signature copy) rather than leaving empty. Never invent copy — only source from the Signature's own stops.
- **Update the tests** in `src/components/studio-v3/__tests__/validate-reveal.test.ts` to reflect the new invariants: `stop-missing-story` no longer forces `ok:false`; add a case where `story` is missing but the reveal still passes.
- Keep the human-touch fallback wired for the true failure modes (no skeleton matched, no stops, missing hero image). Add a small `data-testid="studio-v3-reveal-fallback-reason"` so we can e2e-verify it only appears on genuinely incomplete resolves.

### Validation

- Playwright: 2 adults + 1 child on Arrábida wine → summary total matches the server quote → Stripe embedded checkout charges the same amount. Screenshot both.
- Load `/experiences` on mobile 393×588; confirm "Tailor this day" copy, review chip visible for Arrábida, cards fit without wrapping.
- Studio V3 desktop + mobile happy paths (Arrábida vibe, Sintra vibe): reveal renders instead of the human-touch fallback. Then force an incomplete input (unmatched destination) and confirm the fallback still triggers for the *right* reason.
- Extend `e2e/bokun-checkout-coverage.spec.ts` with a Tailored-with-minor assertion that pre-Stripe total equals server total.

### Files touched

- `src/routes/tours.$tourId.tailor.tsx` — live quote + honest total binding, pass quote token to reserve.
- `src/routes/experiences.tsx` — copy, review chip, density.
- `src/components/studio-v3/validateReveal.ts` — loosen gate.
- `src/components/studio-v3/curation.ts` — story fallback from real Signature stops.
- `src/components/studio-v3/__tests__/validate-reveal.test.ts` — updated invariants.
- `e2e/bokun-checkout-coverage.spec.ts` — Tailored+minor parity assertion.

No backend/schema changes; no new tables; no invented content.
