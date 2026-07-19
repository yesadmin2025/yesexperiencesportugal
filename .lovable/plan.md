Site-wide Motion System — Revised Plan (v2)

Incorporates every correction. No files touched until approval.

## 0 — Real route inventory (verified from `src/routes/`)

Grouped by motion level. Filenames are as they exist today.

**Level 4 · Immersive** (rich cinematic storytelling)

- `index.tsx`, `pt.index.tsx`
- `experiences.tsx`, `pt.experiences.tsx`
- `day-tours.tsx`, `pt.day-tours.tsx`
- `tours.$tourId.tsx`
- Signature landing pages: `arrabida-wine-tour.tsx`, `arrabida-day-trip-from-lisbon.tsx`, `alentejo-wine-tour-from-lisbon.tsx`, `evora-alentejo-wine-tour.tsx`, `evora-private-tour-from-lisbon.tsx`, `sintra-day-tour-from-lisbon.tsx`, `wine-tours-lisbon.tsx`, `private-wine-tour-lisbon.tsx`, `portugal-wine-tours.tsx`, `portugal-tours.tsx`, `private-tours-portugal.tsx`, `luxury-tours-portugal.tsx`, `day-trips-from-lisbon.tsx`, `itineraries.10-day-private-portugal-tour.tsx`
- Campaign/landing: `corporate.tsx`, `pt.corporate.tsx`, `proposal-in-portugal.tsx`, `moments.tsx`, `pt.moments.tsx`, `multi-day.tsx`, `portugal-travel-designer.tsx`, `proposals.tsx`, `pt.proposals.tsx`

**Level 3 · Editorial**

- `local-stories.index.tsx`, `local-stories.$slug.tsx`
- `about.tsx`, `pt.about.tsx`
- `press.tsx`, `reviews.tsx`, `pt.reviews.tsx`

**Level 2 · Functional**

- `contact.tsx`, `pt.contact.tsx`
- `faq.tsx`, `pt.faq.tsx` (both redirects — no motion work; leave as-is)
- `booking-confirmed.tsx`
- `review.$token.tsx`, `unsubscribe.tsx`
- `auth.tsx`
- `i.$token.tsx`, `s.$token.tsx` (share/invite entry) — verify each, apply minimal reveal only if editorial

**Level 1 · Minimal**

- `terms.tsx`, `pt.terms.tsx`
- `privacy.tsx`, `pt.privacy.tsx`
- `cookies.tsx`, `pt.cookies.tsx`

**404** — `NotFoundComponent` in `src/routes/__root.tsx`

**Explicitly excluded from this rollout (no changes):**

- Studio: `studio-v2.tsx`, `studio-v2.i.$token.tsx`, `studio-v3.tsx`, `studio-drift.tsx`
- Builder: `builder.tsx`
- Tailor: `tours.$tourId.tailor.tsx`
- Checkout: `checkout.$token.tsx`, `BrandedCheckoutDrawer`, Stripe surfaces
- All `admin.*`, `auth.tsx` submit logic, `api/*`, `qa.*`, `hero-verify`, `preview-check`, `mcp*`, `email/*`, `.well-known`, `.lovable/*`, `pt.$.tsx` splat, `sitemap[.]xml.ts`
- Existing `.home-energy` visual result (see §14)

**Footer** — one shared component; treated as Level 1 (opacity only on route change, no per-item stagger).

## 1 — Motion foundation

**Single token source: CSS.** `src/styles.css` already owns `--dur-tap/quick/base/slow` and `--ease-premium/snap`. Extend with the missing scene tiers only (no duplication):

```
--dur-text: 560ms;     /* alias of --dur-slow, kept for semantic clarity */
--dur-image: 780ms;
--dur-scene: 1000ms;
--dur-cinematic: 1500ms;
--stagger-sm: 80ms;
--stagger-md: 130ms;
--ease-scene: cubic-bezier(0.22, 1, 0.36, 1);
```

`src/lib/motion/tokens.ts` exports **string references** only (`"var(--dur-text)"`, `"var(--ease-scene)"`) — never numerical duplicates. Consumers that need a number (`setTimeout`) read from `getComputedStyle` via a small `readMotionMs(name)` helper.

**Progressive-enhancement gate.** No content is hidden by default. After hydration, `useEffect` on the root sets `document.documentElement.dataset.motionReady = "1"`. Reveal CSS is scoped:

```css
html[data-motion-ready] .scene-title { opacity: 0; transform: translateY(8px); transition: … }
html[data-motion-ready] [data-scene="in"] .scene-title { opacity: 1; transform: none; }
```

JS-off, hydration-failed, and pre-hydration paints all render fully visible.

**Hooks (`src/lib/motion/`)**

- `useSceneReveal(ref, { level })` — IntersectionObserver (`rootMargin: "0px 0px -10% 0px"`, threshold 0.12). Sets `data-scene="in"` once, then **disconnects the observer immediately**. Runs on **all pointer types** (fix from v1). No-op only when `data-motion-ready` absent or `prefers-reduced-motion: reduce`.
- `useCtaSentinel(sentinelRef, ctaRef)` — separate IO on an explicitly-placed sentinel `<span>` at the narrative "next step" moment. Fires once, toggles `data-cta-active` on the CTA. No viewport-percentage math.
- `useHoverPointer()` — matchMedia `(hover: hover) and (pointer: fine)`. Only hover/parallax/magnetic effects gate on this; scene reveals do not.
- `useWillChangePulse(ref)` — adds `will-change: transform, opacity` on `transitionstart`, removes on `transitionend`/timeout. Used inside `RevealImage` only.

**Primitives (`src/components/motion/`)**

- `Scene` — polymorphic via `as` prop (default `"div"` when parent is already a `<section>`, `"section"` when standalone). Also accepts `asChild` (Radix Slot) to attach `data-scene` and the hook to an existing element without adding a wrapper. Never rewrites heading order, never introduces nested `<section>` inside another `<section>`.
- `ChapterLead` — eyebrow + rule + title; child element type driven by `titleAs` (`h1|h2|h3`), respects existing heading order.
- `RevealImage` — wraps `TourImage` / `<img>`. Preserves `alt`, `srcSet`, `sizes`, `loading`, `fetchPriority`, aspect ratio, focal, caption. Mask via `clip-path: inset(...)` with `@supports (clip-path: inset(0))` guard; fallback = plain opacity fade. Never sets `fetchPriority`. `will-change` applied only during active transition, then removed. Skipped entirely under reduced motion. Never applied to LCP hero images unless the caller explicitly opts in with `motion="none"` disabled — default motion is `mask`, but LCP images should pass `motion="none"`.
- `CtaSentinel` — invisible 1px sentinel element callers drop into the narrative flow.

## 2 — Reduced motion (single, unambiguous rule)

Under `@media (prefers-reduced-motion: reduce)`:

- All `transform`, `clip-path`, `filter`, and scale animations are **removed** (not shortened).
- No stagger delays applied.
- Elements render in final state on mount — **no delayed opacity sequence**.
- Only exception: functional state feedback (focus ring, error color) may use a ≤120ms color/opacity transition. This is state feedback, not reveal choreography.

## 3 — Motion levels

**L1 Minimal** (terms, privacy, cookies + PT twins, footer): opacity fade on route enter (180ms), smooth in-page anchor scroll (respects reduced-motion). No scene hooks mounted.

**L2 Functional** (contact, booking-confirmed, review token, unsubscribe, auth): heading opacity reveal only, field focus/error/success feedback, accordion 220ms, no cinematic delay, forms visible immediately. `auth.tsx` submit logic untouched. `booking-confirmed.tsx` gets a short check-scale-in (240ms) on the confirmation icon, then static content — no confetti.

**L3 Editorial** (local-stories index/slug, about, press, reviews): ChapterLead per major block, RevealImage on hero + selected editorial images (not every image), pull-quote reveal, no per-paragraph animation, optional reading-progress bar on `local-stories.$slug.tsx` (opt-in, respects reduced motion). Local Stories index filter transitions use opacity crossfade with stable grid height.

**L4 Immersive** (homepage, Signature detail, campaign landings, experiences/day-tours, corporate, moments, multi-day, travel-designer): full ChapterLead + Scene sequence, RevealImage masks, sticky-CTA emphasis via `CtaSentinel`, itinerary stops staggered one-by-one. Studio still excluded — `studio-v3.tsx` and its scenes keep their existing motion.

## 4 — Trust metrics (§7)

Rating, review count, and platform stats render as final text in HTML. No digit-by-digit count-up. They receive an opacity reveal + short mask sweep at most, grouped in a single 220ms stagger of ≤3 items. No numeric interpolation logic anywhere.

## 5 — Navbar compaction (§8)

Outer `<header>` retains its current fixed heights (`64/84/96px`) — **no height animation**. Condensed state only:

- Logo `transform: scale(0.94)` (240ms).
- Background alpha shift (existing solid ivory stays; add subtle bottom border fade-in).
- Nav link gap unchanged.
- Touch targets remain ≥44px.
- Focus outlines and click regions preserved.
Mobile menu: 240ms slide+fade with 60ms item stagger, closes in 180ms. No full-screen theatrics.

## 6 — CTA emphasis (§12)

`CtaSentinel` placed manually per page at the point the CTA becomes the logical next step (e.g., after itinerary stop #3 on Signature pages, after the third card on `experiences.tsx`). Fires once; adds a subtle arrow translate + border tone shift. No pulse. Respects reduced motion.

## 7 — Route transitions (§11)

In `__root.tsx` `RootComponent`, wrap `<Outlet />` in a small `<RouteFade>` keyed by `useRouterState({ select: s => s.location.pathname })`:

- 160ms opacity `0.85 → 1`, no transform.
- Disabled entirely on: `/studio-v2*`, `/studio-v3`, `/builder`, `/checkout/*`, `/tours/$tourId/tailor`, `/admin/*`, `/auth`, `/api/*`, `/lovable/*`.
- Disabled under reduced motion.
- Does not block render (component mounts immediately; opacity animates in place).
- Scroll restoration + focus behavior handled by router; wrapper is presentational only.

## 8 — `.home-energy` reconciliation (§14)

Before touching homepage motion, audit `src/lib/home-motion.ts` + `.home-energy` CSS blocks in `styles.css`. For each rule:

- If it sets a duration/easing already covered by tokens → repoint to `var(--dur-*)` / `var(--ease-*)`, keep visual result byte-identical (verified by existing `hero-visual-regression`, `hero-reveal-cadence`, `home-motion` specs).
- If it targets an element the new Scene system will also touch → keep `.home-energy` as the winner (higher specificity) and skip the new hook on that element.
- No duplicate transitions on the same property of the same element.
Approved homepage visual result is preserved; only the plumbing consolidates.

## 9 — Secondary-page treatments (§13)

Per L3/L2/L1 rules above, with these specifics:

- `local-stories.index.tsx`: editorial hero + ChapterLead, cards revealed in groups of 3 (stagger 100ms). Filter change = 160ms opacity crossfade, grid `min-height` locked to prevent CLS.
- `local-stories.$slug.tsx`: article body visible instantly, hero image mask reveal, one pull-quote reveal per article, related-experience section at end uses Scene reveal.
- `about.tsx`: ChapterLead per section, founder image RevealImage, values/philosophy revealed in pairs, closing CTA uses `CtaSentinel`.
- `contact.tsx`: form visible immediately, heading fade only, field focus + success/error state feedback, no background motion.
- `faq.tsx` / `pt.faq.tsx`: redirects — no changes.
- Terms/Privacy/Cookies: title fade only, smooth anchor scroll, ToC if already present.
- 404 (`NotFoundComponent`): one soft opacity reveal on the 404 + CTA. No animation dependency on IO.
- `booking-confirmed.tsx`: check-icon scale-in 240ms, then static. No celebration.

## 10 — Files created / touched

**Created:**

- `src/lib/motion/tokens.ts` (semantic string refs only)
- `src/lib/motion/useSceneReveal.ts`
- `src/lib/motion/useCtaSentinel.ts`
- `src/lib/motion/useHoverPointer.ts`
- `src/lib/motion/useWillChangePulse.ts`
- `src/lib/motion/readMotionMs.ts`
- `src/components/motion/Scene.tsx` (polymorphic + asChild)
- `src/components/motion/ChapterLead.tsx`
- `src/components/motion/RevealImage.tsx`
- `src/components/motion/CtaSentinel.tsx`
- `src/components/motion/RouteFade.tsx`

**Touched (wrapping/classes/sentinel placement only — no logic changes):**

- `src/styles.css` (add tier tokens + reveal utilities under `html[data-motion-ready]`, plus reduced-motion overrides)
- `src/routes/__root.tsx` (set `data-motion-ready` after hydration; wrap `<Outlet />` in `<RouteFade>` with exclusion list; extend `NotFoundComponent` with soft reveal)
- `src/components/Navbar.tsx` (condensed inner-scale + mobile menu stagger; **no header height animation**)
- `src/components/ui/CtaButton.tsx` (arrow translate + press scale via tokens; no pulse)
- L4/L3 route files listed in §0 (Scene/ChapterLead/RevealImage/CtaSentinel placement)
- L2 route files (heading Scene + form field feedback classes)
- L1 route files (title opacity class only)
- Footer component (opacity fade on route change; no per-item stagger)

**Not touched:** all Studio, Builder, Tailor, Checkout, admin, auth submit, api, sitemap, mcp, email, lovable, pt splat, qa/hero-verify/preview-check files. `BrandedCheckoutDrawer`, `SimpleBookingForm`, Stripe surfaces, `TourReviews` sorting logic — none modified in this rollout.

## 11 — Rollout order (each is a discrete batch, verifiable independently)

1. Foundation only: tokens, hooks, primitives, CSS, `data-motion-ready` gate, `RouteFade`. Ship + verify JS-off content visibility and reduced-motion behavior before any consumer wires in.
2. L1 + L2 routes + footer + 404.
3. L3 routes (Local Stories, About, Press, Reviews).
4. L4: Homepage EN + PT (with `.home-energy` reconciliation).
5. L4: Signature detail (`tours.$tourId.tsx`) + itinerary stagger + CtaSentinel.
6. L4: Signature landing pages + Experiences / Day-tours / Corporate / Moments / Multi-day / Travel-designer.
7. Navbar polish + CtaButton token pass.
8. QA sweep (§12).

## 12 — QA checklist (blocking for release)

- Browsers: mobile Safari, desktop Safari, Chrome, Firefox.
- Viewports: 393×852 mobile, 834 tablet coarse pointer, ≥1280 desktop.
- Content visibility with JS disabled — full text rendered on L1–L4 routes.
- Delayed hydration (throttled CPU) — content readable pre-hydration; reveals apply cleanly post-hydration.
- Reduced motion — zero transform/clip-path/scale; no stagger; final state on mount.
- Keyboard-only navigation — every CTA reachable, focus ring visible throughout transitions.
- No CTA is pointer-blocked during any Scene reveal.
- Landmark structure unchanged (single `<main>`, heading order intact) — verified with axe.
- Lighthouse mobile: no LCP regression >100ms, no CLS regression, no INP regression on home / Signature detail / Local Stories article.
- React StrictMode: hooks fire once per element (guard with `data-scene` presence check).
- No IntersectionObserver left connected after reveal (disconnect on fire + on unmount).
- No persistent `will-change` on `<img>`, `<video>`, or hero surfaces (verify via DevTools inspection after animation completes).
- Playwright: extend existing `hero-reveal-cadence.spec.ts` pattern with a small `motion-progressive-enhancement.spec.ts` (JS-off content visibility) and `motion-reduced-motion.spec.ts` (transforms absent).

Return this plan for approval before any file changes.

The revised plan is approved subject to the following final corrections. Incorporate these directly into the plan and then proceed with Batch 1. A further full-plan rewrite is not required.

**1. Use a real CSS token alias**

Do not duplicate the numerical value of --dur-slow.

Replace:

--dur-text: 560ms;

with:

--dur-text: var(--dur-slow);

Keep CSS custom properties as the only numerical source of truth.

**2. Replace the global hiding gate with per-Scene progressive enhancement**

Do not use html[data-motion-ready] in a way that can make already-visible content disappear after hydration.

Content must remain visible by default.

Each Scene should determine its initial state individually:

- if the Scene is currently inside or close to the viewport, set data-scene="in" immediately;
- if the Scene is below the viewport, set data-scene-ready="1" and prepare its reveal state;
- only elements inside [data-scene-ready="1"] may receive hidden initial styles;
- when the observer fires, change to data-scene="in" and reveal;
- never hide a Scene that the user can already see;
- if JavaScript or hydration fails, all content remains visible.

This must be verified under delayed hydration and CPU throttling.

**3. Make RevealImage genuinely opt-in**

Set the default to:

motion="none"

Mask, scale or other motion must be declared explicitly at each approved call site.

Never require callers to remember to disable motion for LCP images.

LCP hero images, logos, maps, payment content and functional imagery should remain motion="none" unless explicitly reviewed.

**4. Do not add Radix Slot as a dependency**

Use asChild only if Radix Slot is already installed and actively used by the project.

Otherwise:

- omit asChild;
- use the polymorphic as prop;
- or allow direct hook integration on an existing element.

No new dependency may be added for the Scene abstraction.

**5. Implement reading progress with transform**

The Local Story reading-progress indicator must not animate width.

Use:

transform: scaleX(var(--reading-progress));

transform-origin: left;

The track retains stable dimensions.

The indicator must be non-interactive, decorative and hidden from accessibility APIs.

Under reduced motion, update it without transition or omit it entirely.

**6. Prepare will-change before animation starts**

Do not add will-change on transitionstart.

For RevealImage:

1. add will-change;
2. wait one animation frame;
3. activate the reveal on the following frame;
4. remove will-change on transitionend;
5. retain a timeout fallback;
6. remove it on component cleanup.

No image, video or hero element may retain persistent will-change.

**7. Use robust route exclusions**

Do not compare against route-pattern strings such as:

/tours/$tourId/tailor

Prefer router route IDs.

Where pathname checks are necessary, use robust prefix or regular-expression predicates for dynamic routes.

Ensure exclusions cover every intended Studio, Builder, Tailor, Checkout, Admin, Auth and internal route.

Also verify whether the shared Footer is inside the RouteFade wrapper. It must not receive two simultaneous opacity transitions.

**8. Calibrate Level 4 density**

Level 4 defines the available immersive vocabulary. It does not mean every Level 4 route must use maximum animation density.

Use full Level 4 intensity primarily for:

- homepage;
- Signature detail pages;
- major narrative campaign pages.

SEO-focused landing pages should use Level 4 components with Level 3 density:

- fewer image masks;
- fewer animated sections;
- shorter sequences;
- immediate readable content;
- no animation added merely to create visual activity;
- strict LCP and INP protection.

Motion intensity must be decided section by section according to narrative and conversion purpose.

After applying these corrections, proceed with Batch 1 only:

- CSS tokens;
- hooks;
- primitives;
- progressive-enhancement behaviour;
- reduced-motion rules;
- RouteFade foundation.

Do not connect the primitives to public routes until the foundation passes the Batch 1 QA checks.