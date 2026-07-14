## Scope

Three independent workstreams, shipped in one pass so Studio failures show the same voice everywhere, every stop-bearing page emits gallery-grade JSON-LD, and the new `RefineStopCard` is locked by tests.

---

## 1 · Harden Signature + Builder edge-function error shapes

Today the two Studio-facing edge functions return `{ error: "human string" }` at status 4xx/5xx, sometimes with structured `code:reason` slugs (`quote_stale:expired`, `bokun_unreachable:...`) and sometimes with raw prose (`"Return URL not allowed"`, `"Quote signing secret not configured"`, `` `Quote token invalid: ${e.message}` ``). Callers (`quoteClient.ts`, `bookingQuoteCheckout.ts`) either `throw error` verbatim or surface the raw string via `toast.error`, so the guest sees engineer prose ("Computed amount below minimum", "quote_lookup_failed:...", "bokun_unreachable:fetch failed").

**Change — edge side (both functions + shared helper):**
- Add `supabase/functions/_shared/checkoutError.ts` with a single `jsonError(code, status, opts?)` that emits `{ error: { code, message, retryable, requestId } }` (stable machine `code`, guest-safe `message`, `retryable` boolean, and a `requestId` for support). Keeps existing CORS headers.
- Introduce a fixed `code` vocabulary (`quote_stale`, `quote_expired`, `quote_mismatch`, `signature_unavailable`, `amount_below_minimum`, `return_url_not_allowed`, `bokun_unreachable`, `slot_unavailable`, `capacity_exceeded`, `category_not_ready`, `pricing_unavailable`, `config_missing`, `validation_failed`, `internal_error`). Every existing `jsonError("...", 400)` call in `create-signature-checkout` and `create-builder-checkout` maps to one of these.
- Preserve legacy string payload for one release by keeping `error: message` as a top-level alias next to the object, so old clients don't break mid-deploy.
- Log the internal detail server-side (existing `console.error`), never in the response.

**Change — client side:**
- Add `src/lib/checkout/checkoutError.ts` — `parseCheckoutError(err)` normalises: (a) TSS/edge JSON with `{error:{code,message,...}}`, (b) legacy `{error: string}`, (c) network/timeout, (d) unknown — to a single `{ code, userMessage, retryable, supportId? }`. Maintains one copy deck in `src/content/checkout-errors.ts` mapping every code → editorial-voice guest message ("Your quote just refreshed — take a fresh look and try again.", "That time slot filled while you were choosing. Pick another and we'll hold it right away.", etc.). Copy stays brand-consistent (no "Error 409", no engineer verbs).
- `quoteClient.fetchStudioQuote` / `createStudioSession` / `createBookingQuoteSession` / `fetchBookingQuote` route all thrown errors through `parseCheckoutError`.
- `BrandedCheckoutDrawer`, `StudioV3.handleStripeCheckout`, `BandedSignatureBookingForm`, and the Builder checkout path swap ad-hoc `toast.error(String(err))` for `toast.error(userMessage)` and, when `retryable`, keep the primary CTA enabled with a "Try again" affordance.
- Studio's `client_error_logs` breadcrumb records `{code, supportId}` (no PII) so we can trace repeats.

**Tests:**
- `src/lib/checkout/__tests__/checkoutError.test.ts` — parse matrix (5 shapes → 5 codes).
- Extend existing `create-signature-checkout` Deno test (if present, otherwise add) to assert the `{error:{code}}` envelope for one representative failure per code family.

---

## 2 · Stop image + media structured data on every page

Locks a single JSON-LD emitter across the four page families that carry stops today, and extends coverage to the two that don't. Every stop image passes through `imageObjectLd` (caption + creditText already in place), and the page emits a page-scoped `ImageGallery` when ≥3 stop photos exist.

**Change — `src/lib/jsonld.ts`:**
- Add `stopMediaLd(pageUrl, stops)` that returns an `ItemList` where each `ListItem` embeds a `TouristAttraction` with `image` (single `ImageObject` per stop, with caption sourced from the stop label + short story clip and `contentUrl` absolute).
- Add `pageGalleryLd(pageUrl, name, photos[])` shortcut around `imageGalleryLd` that dedupes URLs and skips when <3.
- Keep `tourProductLd` untouched; it already threads gallery into `associatedMedia`.

**Change — page emitters:**
- **`src/routes/tours.$tourId.tsx`** (Signature detail): replace the inline `ImageGallery` block (lines 146–168) with `pageGalleryLd(url, ...)`; add `stopMediaLd(url, stops)` for the itinerary stops so each stop advertises its own photo, not only the tour hero.
- **`src/routes/itineraries.10-day-private-portugal-tour.tsx`**: emit `stopMediaLd` for each daily stop plus a `pageGalleryLd` of all day photos.
- **`src/lib/planning-head.ts`** (plan hubs — Arrábida / Comporta / Alentejo / Wine & Gastronomy / …): already emits `imageGalleryLd` on some pages; extend to always emit `stopMediaLd` when the destination page renders a stop list, and hoist `pageGalleryLd` to every plan hub with ≥3 real stop photos.
- **`src/routes/experiences.tsx`** and **`src/routes/pt.experiences.tsx`**: augment the existing `itemListLd` items with `image: imageObjectLd(...)` per experience card instead of a bare string URL.
- **`src/routes/index.tsx`**: add `pageGalleryLd` for the moments/gallery block (still ≥3 photos rule).

**Non-goals / guardrails:**
- No invented photos — pull from existing `stopPhotos`, `getTourGallery`, `guestPhotos`, and the assets curated in the previous turn. If a stop has no image, it's omitted from the gallery node (schema stays valid) but still listed in `stopMediaLd` without an `image` field.
- Every URL is absolutised via `absUrl(...)`; no relative paths in JSON-LD.
- All new emitters are pure builders — no runtime data fetching from `head()`.

**Verification:**
- Snapshot test `src/lib/__tests__/jsonld-stop-media.test.ts` covering `stopMediaLd` shape, dedupe, absolute URLs, and gallery threshold.
- Manual: paste the tour page HTML through Google's Rich Results test URL locally (`curl` + regex extract) to confirm 0 warnings.

---

## 3 · Component tests for `RefineStopCard` (desktop + mobile, empty + error)

`refine-stop-card.test.tsx` already locks the plan-§D primitives (hit targets, disabled semantics, read-more, swap pool). Extend it to cover the newly-wired Studio integration so a regression in `StudioV3` fails a fast unit test instead of a live checkout.

**New file — `src/components/studio-v3/__tests__/refine-stop-card-integration.test.tsx`:**
- **Desktop (≥1024px matchMedia stub):** renders a 4-stop list through `RefineAccordion` + `RefineStopCard`, asserts action-cluster labels are visible (`sm:inline` "Earlier/Later/…" spans) and hit targets remain 44×44.
- **Mobile (393px matchMedia stub, per Core mem):** same list, asserts action labels are icon-only (spans hidden), toolbar wraps to full-width, single column layout.
- **Empty state:** `editedStops = []` — asserts the fallback `studio-v3-stops-editor-empty` renders with the "Add a moment" CTA when `swapPool.length > 0`, and the "Signature complete" message when `isRouteComplete && swapPool.length === 0`.
- **Error / edge cases:**
  - `total === 1` disables Earlier + Later + Remove; Swap stays enabled iff `canSwap`.
  - `canSwap === false` renders Swap with `aria-disabled="true"` and `tabIndex="-1"`.
  - `onRemove` throw is caught by parent (mock parent state reducer that throws) — asserts the card doesn't crash the tree and surfaces a `toast.error` stub.
  - Swap pick with a candidate missing `story` — asserts the resulting stop has `story: ""` (fixes the type-narrowing case we hit last turn).
- **Persistence hook wiring:** `useStudioDraft`-backed render — mount, edit, unmount, remount → edits persist (regression guard for the earlier "edits reset on reopen" bug).

**Test infra:**
- Reuse `renderWithStudioProviders` if it exists (grep first); otherwise wrap in a minimal `<StudioDraftProvider>` mock.
- No Playwright; all unit-level via `@testing-library/react` + `vitest`. Runs in the existing `bunx vitest run` gate.

---

## Technical notes

- No new dependencies. Edge functions stay on Deno; shared helper is a plain `.ts` file under `supabase/functions/_shared/`.
- No schema/migration changes.
- No copy invented for tours/stops. Only new copy is the guest-facing error strings in `checkout-errors.ts` (13 codes × 1 sentence).
- Order of ship: (3) tests scaffold first so (1) and (2) land against a green baseline; (1) edge-side stays backward-compatible for one release via the aliased `error` field.

## Verification checklist

- `bunx vitest run` green including the three new test files.
- `supabase.test_edge_functions` green for `create-signature-checkout` + `create-builder-checkout`.
- Mobile 393px Playwright pass on `/studio` → refine → force-quote-stale → toast reads the editorial message, not `quote_stale:expired`.
- View-source on `/tours/<id>`, `/itineraries/10-day-private-portugal-tour`, `/plan/arrabida`, `/experiences`, `/` — confirm `ItemList` with per-stop `image` and `ImageGallery` node present.
