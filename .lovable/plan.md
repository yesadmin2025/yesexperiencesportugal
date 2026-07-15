
## Scope

Two focused fixes, no business logic touched (no Studio, Tailor, pricing, Stripe, Supabase, booking, email).

---

### 1. `/multi-day` "travel file" — stop rendering all 23 pages as a giant scroll wall

Today the section renders one large cover spread **plus 22 more full-width JPGs stacked as a 2–5 column grid**. On mobile this becomes ~22 tall images = the "huge PDF-feeling" page the user described.

Replace with a homepage-style compact treatment (same section, same copy, same source images — only presentation shrinks):

- **Keep**: eyebrow, title, italic teal lede, "What's inside your file" cards, lead cover spread.
- **Replace the 22-thumbnail grid** with a **peek strip**: a single horizontal, snap-scroll rail of the next ~6 pages at ~140–160px wide (mobile) / ~180px (desktop), each with a subtle page number chip and hover lift consistent with homepage cards.
- Add one ghost CTA underneath: **"Open the full file (23 pages)"** → opens the existing cover PDF path in a new tab (uses page 1 image link, same behavior as today's tap-to-open). Any individual page still opens full-size on tap.
- Motion: the strip inherits the marketing `[data-motion]` fade+rise primitive; no autoplay, no carousel dots, respects `prefers-reduced-motion`.
- Net result: section height drops from ~22 image rows to one cover + one 1-row strip — matches the compact rhythm of homepage sections.

No changes to `SAMPLE_PAGES` source, alt text, or file locations. No new asset uploads.

---

### 2. Site-wide premium motion parity with the homepage

Homepage runs `useMarketingMotion()` → boots `startHomeMotion` with the scoped `[data-motion]` / `.motion-in` primitive (fade + translateY ≤8px, ≤220ms, reduced-motion safe, single-fire per element). Rules already codified in `src/hooks/use-marketing-motion.ts` and `styles.css` under `html[data-motion-scope="marketing"]`.

Currently missing on these public routes (verified via `rg`):
- `/multi-day` (Travel Designer)
- `/corporate`
- `/proposal-in-portugal`
- `/celebrations` (if present as a public marketing route — confirm during build)

Changes:

1. **Mount `useMarketingMotion()`** at the top of each route's page component. No global wrapper — per-page boot only, as the hook contract requires. Studio, Tailor, Builder, Signature booking, checkout, admin, auth stay untouched.

2. **Tag section-level reveal targets** with `data-motion="fade-up"` (or the existing project variant) on:
   - Section headers (Eyebrow + SectionTitle blocks)
   - Editorial cards / image blocks
   - CTA rows
   Cap: max ~6 tagged elements per section to keep it premium, not busy.

3. **Add subtle image-hover lift** (`transition-transform duration-700 hover:scale-[1.02]`) to any editorial `<img>` inside these routes that doesn't already have it — matches homepage `EditorialCard` behavior. Nothing bouncy, no spring, no parallax outside `.home-energy` (guardrail respected).

4. **Verify reduced-motion**: because we reuse the existing primitive, `prefers-reduced-motion: reduce` short-circuits automatically. No additional CSS needed.

---

### Out of scope (explicitly not touched)

- Homepage itself (already correct)
- Studio, Tailor, Builder, Signature booking flow, checkout
- Copy on any route (only the one new CTA label "Open the full file (23 pages)")
- Pricing, Stripe, Supabase, email templates
- Brand tokens, typography, gold rule, eyebrow primitives
- Any of the 23 sample-page image assets
- No new animation library, no framer-motion introduction — reuse the existing `home-motion` controller only

---

### Verification

- Manual mobile screenshot of `/multi-day` before/after to confirm the section is short.
- Grep to confirm `useMarketingMotion` present in all 4 target routes.
- Grep to confirm no new `motion/react` / `framer-motion` imports introduced.
- Reduced-motion sanity check via emulated media query.

---

### Files expected to change

- `src/routes/multi-day.tsx` — compact travel-file section + `useMarketingMotion()` + `data-motion` tags
- `src/routes/corporate.tsx` — `useMarketingMotion()` + `data-motion` tags
- `src/routes/proposal-in-portugal.tsx` — `useMarketingMotion()` + `data-motion` tags
- (Confirm & apply to `celebrations.tsx` if it exists as a public marketing route)

No new files, no new components, no new dependencies.
