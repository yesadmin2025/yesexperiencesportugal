# Extend Homepage Motion Language to Public Marketing Pages — Bounded Plan

Read-only inspection complete. No files touched. Awaiting approval before any edit.

---

## 1. Existing homepage animation system (found in the codebase)

**Controller — `src/lib/home-motion.ts**` (canonical source of truth):

- Selector: `[data-motion]`. Fallback-safe: content is visible until `html.motion-ready` is set, so a JS failure never hides copy.
- Entry rule: `rect.top < window.innerHeight * 0.88 && rect.bottom > 0` → adds class `motion-in`. Runs **once** per element.
- `prefers-reduced-motion: reduce` → marks every element `motion-in` immediately and never sets `motion-ready`.
- Auto-tags legacy `.reveal`, `.reveal-stagger`, `.section-enter` with `data-motion` so existing tree benefits without per-component edits.
- Wired only on the homepage today (grep: only `src/routes/index.tsx` boots `startHomeMotion`).

**CSS tokens (in `src/styles.css`)**:

- Easing token: `--ease-premium` (single premium easing used by hero reveals, scroll reveals, CTAs).
- Duration tokens: `--transition-fast: 180ms`, `--transition-base: 220ms`, `--transition-slow: 320ms`.
- `[data-motion]` default hidden state (once `.motion-ready`) → `opacity:0; translateY(≈22px)`; `.motion-in` releases to `opacity:1; translateY(0)` at `--transition-base` with `--ease-premium`.
- Homepage-scoped extras live under `.home-energy` (parallax, sheen sweep, glow lift) — **out of scope** for this rollout per Core memory ("motion overrides scoped under .home-energy, other routes stay strict").

**CTA primitives (site-wide, already used everywhere)**:

- `src/components/ui/CtaButton.tsx` — primary/ghost/ghostDark/hairline variants; already includes `group/translate-x-1` arrow slide on scroll  subtle -1px lift over ~300ms, ring-on-`--gold` focus. **No changes to labels, destinations, `onClick`, analytics, or click behaviour proposed.**
- `src/components/ui/Eyebrow.tsx`, `SectionTitle.tsx`, `CtaPair.tsx`, `BookingCtaSkeleton.tsx` — the shared editorial surface.

**Reduced-motion contract already enforced** by `home-motion.ts` and by `@media (prefers-reduced-motion: reduce)` blocks in `styles.css`.

**Conclusion:** the homepage already ships the exact primitive we need — `[data-motion]` + `.motion-in` — with all the guarantees the brief requires (once-only, ≤220ms, opacity+small translateY, reduced-motion safe, no layout shift). The task is a **per-page boot + `data-motion` tagging**, not a new animation system.

---

## 2. Public pages proposed for refinement

Marketing routes only. Explicitly excludes Studio, Signature booking flow, Tailored, Builder, checkout, Stripe, admin, edge functions, auth, and all `pt.*` PT-locale mirrors (they'd inherit the same treatment in a later pass, not this one).

**Included (17 routes):**
`about.tsx`, `contact.tsx`, `experiences.tsx`, `faq.tsx`, `moments.tsx`, `press.tsx`, `reviews.tsx`, `local-stories.index.tsx`, `local-stories.$slug.tsx`, `day-tours.tsx`, `day-trips-from-lisbon.tsx`, `luxury-tours-portugal.tsx`, `portugal-tours.tsx`, `portugal-wine-tours.tsx`, `private-tours-portugal.tsx`, `wine-tours-lisbon.tsx`, `itineraries.10-day-private-portugal-tour.tsx`.

**Explicitly excluded (do NOT touch):**

- Booking / commercial: `checkout.$token.tsx`, `tours.$tourId.tsx`, `tours.$tourId.tailor.tsx`, `booking-confirmed.tsx`, `s.$token.tsx`, `i.$token.tsx`, `review.$token.tsx`, `auth.tsx`, `builder.tsx`, `multi-day.tsx`, `portugal-travel-designer.tsx`, `proposal-in-portugal.tsx`, `corporate.tsx` (proposals/human).
- Individual Signature tour pages that carry live booking widgets: `alentejo-wine-tour-from-lisbon.tsx`, `arrabida-day-trip-from-lisbon.tsx`, `arrabida-wine-tour.tsx`, `evora-alentejo-wine-tour.tsx`, `evora-private-tour-from-lisbon.tsx`, `sintra-day-tour-from-lisbon.tsx`, `private-wine-tour-lisbon.tsx` — deferred to a second pass so we can verify none of their motion touches the booking card.
- Utility/legal: `privacy.tsx`, `terms.tsx`, `cookies.tsx`, `unsubscribe.tsx`, `sitemap[.]xml.ts`, `preview-check.tsx`, `qa.*`, `hero-verify.tsx`, `brand-qa.tsx`, `typography-audit.tsx`, `pt.*`, all `admin.*`, all `api/*`, all `lovable/*`, all `email/*`.

If you want the excluded Signature tour pages included, say so and I'll add them behind the same safeguards.

---

## 3. Exact files that would change

**Motion boot per page (17 route files):** each of the 17 routes above gets a single small `useEffect` calling `startHomeMotion()` (imported from `@/lib/home-motion`) so the controller runs only when that route is mounted. No global wrapper in `__root.tsx` — that would risk affecting checkout, admin, auth, and application routes.

**Section tagging (per-page component files these routes render):** add `data-motion` (and optional `data-motion-order="1|2|3"` when we want a soft stagger already supported by the controller) to top-level section wrappers only — headline block, section band, editorial card row, testimonial rail, FAQ list, CTA band. I will list the exact section-level files after your approval so the change set stays minimal; expected: 1 route file + 1–3 section components per page.

**No changes to:**

- `src/lib/home-motion.ts` (already correct).
- `src/styles.css` (all needed tokens/rules exist).
- `src/routes/__root.tsx` (no global wrapper).
- `src/components/ui/CtaButton.tsx` (CTAs already meet the brief's arrow/focus/pressed spec).
- Any component tree, prop, or JSX text.

---

## 4. Exact effect proposed for each file

Every route on the list gains the same behaviour:

- **Section entry:** `opacity 0 → 1` and `translateY(8px → 0)` (I'll cap the CSS at 8px per your brief — the homepage default is 22px; a page-scoped override rule `[data-motion-scope="marketing"] [data-motion]{transform:translateY(8px)}` under `.motion-ready` keeps homepage untouched). Duration `--transition-base` (220ms). Easing `--ease-premium`. Runs once. No scale. No shadow. No parallax. No shimmer. No continuous motion.
- **CTA hover (already present, not re-added):** arrow slides 2–3px via existing `group-hover:translate-x-1` on `CtaButton`; background/border transitions are the existing `--transition-base` treatment.
- **CTA focus:** existing `ring` on `--gold` with `--ivory` offset — already spec-compliant.
- **CTA pressed:** existing `active:` -0.5px settle in `CtaButton` — already spec-compliant.
- **Reduced motion:** controller short-circuits → everything visible instantly, no transitions.
- **Fallback safe:** if JS never boots, content stays visible (no opacity:0 pre-boot).
- **No layout shift:** transform-only + opacity; nothing changes box size, position offset, or hit target.
- **No interaction delay:** `motion-in` doesn't gate `pointer-events`; hit targets are live from first paint.

New CSS additions total ~6 lines (the marketing-scoped 8px override + a `data-motion-scope` selector). No new keyframes, no new tokens, no new utilities.

---

## 5. Components that will remain untouched

- `src/components/ui/CtaButton.tsx`, `CtaPair.tsx`, `Eyebrow.tsx`, `SectionTitle.tsx`, `BookingCtaSkeleton.tsx`, `button.tsx`.
- All Studio v3 components (`src/components/studio-v3/*`), Signature booking components (`SimpleBookingForm`, `FinalDetailsDialog`, `BrandedCheckoutDrawer`, `SignaturePriceCard`, `CheckoutSummary`, `GuestStepper`, `GuestDetailsStep`), Builder components (`src/components/builder/**`), admin components, checkout components.
- Hero components (already hand-tuned motion — will not be re-tagged).
- Any component already carrying `.reveal`, `.reveal-stagger`, `.section-enter`, `.hero-reveal`, or `data-hero-reveal` (already animated — brief forbids re-animating).
- `home-motion.ts`, `styles.css` hero blocks, `.home-energy` scope.
- All `pt.*` PT-locale routes (deferred).
- All excluded routes listed in §2.

---

## 6. Confirmation of what will NOT change

- **SEO:** no `head()`, `<title>`, `<meta>`, canonical, `<link>`, JSON-LD, `og:*`, `twitter:*` changes.
- **Copy:** zero text edits, zero label edits, zero microcopy edits.
- **Images:** no image swaps, no `src`/`srcset`/`alt`/`sizes`/aspect-ratio changes. Owner-image insertion points identified in §7-adjacent notes only when you ask; not part of this rollout.
- **Routing:** no route additions, deletions, renames, or URL changes; no `Link.to` changes; no redirect table changes.
- **Business logic:** no changes to Studio, Signature, Tailored, Builder, pricing, checkout, Stripe, Supabase queries, edge functions, admin, or auth. No hook signature change. No prop-contract change on any component. No analytics event change.
- **A11y contract:** focus rings, tap-target size (≥44×44), `prefers-reduced-motion`, keyboard order — all preserved. Motion adds `data-motion` attribute only, never `aria-*`, never `tabIndex`, never `pointer-events`.

---

## 7. Estimated file count

- **17 route files** — 3–6 line diff each (`useEffect` + `data-motion-scope` attribute on the outer wrapper).
- **~12–20 section component files** — 1-attribute additions (`data-motion` on the top-level section element). Exact list produced after approval; strict cap of 25 total section files.
- **1 CSS file** — `src/styles.css`, ~6 additive lines for the marketing-scoped 8px translateY rule.

**Total: ~30–40 files, all edits ≤6 lines each. No new files. No renames. No deletions. No installs.**

---

**Awaiting your go-ahead to proceed.** On approval I will produce the exact section-file list first (still no edits), then implement page-by-page so any regression is bisectable to a single route. You can upgrade animations all over the website if it's better for conversion and with premmium flow