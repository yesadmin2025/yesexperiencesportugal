
# Phase 3 — Launch-Critical Fixes (all-in-one)

Skipping full re-audits per your choice. This is a prioritised, minimal-surface fix pass across §12–20, built on what Phase 1–2 already established (canonical NAP, `whatsappUrl()`, `CtaPair`, `/studio-v3` sweep, sitemap/canonicals).

Design contract stays intact: premium editorial, brand tokens, Montserrat/Georgia/Inter, no redesigns, no new visuals.

---

## Priority 1 — Checkout trust & clarity (§12)

**Problem:** Two live checkouts (`/checkout/$token` bespoke, Signature → Stripe) lack a unified pre-payment trust strip. CTA vocabulary drifts ("Reserve", "Tailor", "Secure", "Design & Book", "Continue draft").

**Fix (surgical):**
1. Create `src/components/checkout/TrustStrip.tsx` — one shared row: `Secure payment · Stripe` · `Free cancellation up to 48h` · `Licensed operator RNAAT 31/2023` · `WhatsApp support` (links to `whatsappUrl()`). Uses existing tokens; no new visuals.
2. Mount `TrustStrip` in:
   - `src/routes/checkout.$token.tsx` (above the submit button)
   - Signature booking panel `src/components/studio-v2/conversion/FinalBookingPanel.tsx` (above primary CTA)
   - Tour page pre-checkout `src/routes/tours.$tourId.tsx` (below price, above Reserve)
3. **CTA vocabulary lock** (site-wide sweep, label-only, no logic changes):
   - Signature primary → **"Check availability & reserve"**
   - Signature secondary → **"Tailor this day"**
   - Studio V3 final → **"Review route & price"** → **"Reserve securely"**
   - Bespoke checkout submit stays **"Confirm my bespoke day"** (already correct)
   - Drop "Design & Book" / "Continue draft" ambiguity → **"Resume your draft"** for returning drafts only.
4. Add `data-analytics="checkout_started"` on every entry to a payment step (feeds §5).

**Files:** `src/components/checkout/TrustStrip.tsx` (new), `checkout.$token.tsx`, `FinalBookingPanel.tsx`, `tours.$tourId.tsx`, Signature card component, Studio V3 final step, `MobileStickyCTA.tsx`.

---

## Priority 2 — Review source icons clickable & accessible (§14)

**Fix:** In the review card component (single source):
- Wrap TripAdvisor icon in `<a href={review.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="View this review on TripAdvisor">`.
- Add hover: `opacity-70 → 100`, `scale-[1.03]`, `transition-transform duration-200`.
- Tap target min 44×44 (padding, not icon size).
- Icon only + `aria-label` (no visible label — keeps card calm).
- `stopPropagation` on click so it never triggers carousel drag/swipe.
- Fallback: if `sourceUrl` missing, render non-interactive (no dead link).

**Files:** `src/components/reviews/ReviewCard.tsx` (or equivalent — will locate).

---

## Priority 3 — Mobile cards behaviour (§15)

**Reviews:** one-card-at-a-time, snap-center, manual swipe, no autoplay, one-time subtle hint on first view via `IntersectionObserver` (fade a chevron for 1.5s then remove).

**Signature cards:** horizontal scroll with ~12% peek of next card (`scroll-snap-align: start`, `padding-inline-end` on last), no autoplay, ensure title/region/price/duration + CtaPair visible without scroll inside card.

Both use CSS scroll-snap (no JS carousel lib). Verify no autoplay timers exist; remove if found.

**Files:** review section on `routes/index.tsx`, `SignatureRow.tsx` (or homepage Signature list).

---

## Priority 4 — Floating button overlap (§16)

**Fix:**
- Add global mobile padding: `main { padding-bottom: env(safe-area-inset-bottom) + 96px }` on routes where a sticky CTA + WhatsApp FAB coexist.
- WhatsApp FAB already positions bottom-right — add sibling detection: when `MobileStickyCTA` is visible, raise FAB by 64px (CSS var `--fab-lift`).
- Hide back-to-top on `< 640px` (or fold into FAB stack with 12px gap).
- Verify no overlap on: FAQ accordion controls, Signature card CTAs, `/checkout/$token` submit, footer.

**Files:** `WhatsAppSupportButton.tsx`, `MobileStickyCTA.tsx`, `FloatingActions.tsx`, `styles.css`.

---

## Priority 5 — CTA / contrast / motion polish (§13)

**Minimal, systemic:**
- Extend `CtaButton` primitive: `hover:[&_svg]:translate-x-[3px] transition-transform duration-200`, `active:scale-[0.98] duration-100`.
- Section reveal: fade + translateY 12px, 240ms `ease-out`, IO threshold 0.15, one-shot, gated by `prefers-reduced-motion`.
- Contrast sweep: any `text-charcoal/60` or lower on ivory → bump to `/70` minimum; small labels (<12px) → `/80`. Keep gold decorative only.
- CTA text on video/image → add `text-shadow: 0 1px 2px rgba(0,0,0,0.35)` scoped to hero only.
- Ensure focus-visible ring on every interactive element (Radix + shadcn already correct; audit hand-rolled buttons in `FloatingActions`, review icons).

**Files:** `src/components/ui/CtaButton.tsx`, `styles.css` (utility additions), scan for opacity <70% on charcoal.

---

## Priority 6 — GA4 via GTM (§17)

**Approach:** Install GTM once; fire events via `window.dataLayer.push(...)`. Data attributes drive most; a small `useAnalytics` hook covers programmatic events.

1. Add GTM snippet to `src/routes/__root.tsx` `head().scripts` (container ID from secret `GTM_CONTAINER_ID` — will request via `add_secret`).
2. Create `src/lib/analytics.ts` — `track(event, params)` pushes to dataLayer, no-op in SSR/tests.
3. Create `src/lib/analytics-attrs.ts` — global click listener reads `data-analytics="..."` + `data-analytics-*` params and fires `track()`.
4. Attach `data-analytics` attributes:

| Event | Location |
|---|---|
| `hero_open_studio_click` | Hero primary CTA |
| `hero_choose_experience_click` | Hero secondary CTA |
| `five_ways_{signature\|studio\|moments\|corporate\|travel_designer}_click` | Homepage Five Ways cards |
| `studio_start_click` | Any "Open the Studio" |
| `studio_step_complete` | Existing `useStepTimer` `continue` — mirror to dataLayer |
| `studio_continue_draft_click` | Resume draft CTA |
| `signature_reserve_click` | Signature primary CTA |
| `signature_tailor_click` | Signature secondary CTA |
| `review_source_click` | §2 icon link |
| `whatsapp_click` | `WhatsAppSupportButton` + all `whatsappUrl()` anchors |
| `email_click` | All `mailto:` links |
| `local_story_cta_click` | Local Stories CTAs |
| `checkout_started` | §1 pre-payment mount |
| `payment_success` | Stripe success route + bespoke `done=true` |

Params: `page_type`, `placement`, `item_slug`, `experience_slug`, `story_slug`, `card_type`, `device` (auto from `useIsMobile`), `value`, `currency`, `source`.

5. Also mirror existing `studio_v3_funnel_events` into dataLayer so GA4 gets funnel events without a second capture layer.

---

## Priority 7 — Performance safety (§18)

- Add `<link rel="preload" as="image" fetchpriority="high">` for hero poster in `__root.tsx` or index route head.
- Ensure all `<img>` have `width`/`height` (CLS). Grep and add where missing.
- Convert hero poster + top-of-fold images to AVIF/WebP via `vite-imagetools` (already installed? verify — otherwise `bun add -D vite-imagetools`).
- Confirm hero video: `preload="metadata"`, `poster` set, MP4 first source, lazy on `< 640px` (poster only, autoplay on interaction) — already partially done; verify.
- Below-fold images: `loading="lazy" decoding="async"`.
- Defer GTM: `async` after LCP (2s timeout fallback).

---

## Priority 8 — Accessibility (§19)

- Icon-only buttons audit: `FloatingActions`, review source (fixed in §2), close buttons in modals — add `aria-label`.
- Ensure single `<main>` per route (root layout already correct — verify no leaf duplicates).
- FAQ accordion: confirm shadcn `Accordion` (already keyboard-accessible).
- Focus-visible: check hand-rolled buttons (`FinalBookingPanel`, `CtaPair` children) — add `focus-visible:ring-2 focus-visible:ring-[--gold]`.
- `prefers-reduced-motion`: audit `.home-energy` scope — already respected, verify sequenced reveals disable.
- Contrast: handled in §5.

---

## Priority 9 — Final launch QA (§20)

Automated + manual:
1. Extend `src/__tests__/nap-consistency.test.ts` with a link-crawler test: parse all routes, assert every internal `<Link to>` matches `routeTree.gen.ts` and every external link has `rel="noopener noreferrer"`.
2. Playwright smoke: home → Signature → Reserve → checkout mount → assert TrustStrip present; home → Studio V3 → final → assert "Review route & price" label.
3. Manual QA checklist stored at `.lovable/launch-qa.md` (copy links, CTA labels, footer, WhatsApp, email, TripAdvisor, sitemap URLs, no placeholder text, no dev-only routes indexable).

---

## Order of implementation

1. §1 TrustStrip + CTA vocabulary lock (biggest conversion delta, lowest risk)
2. §2 Review source links (a11y + trust, 1 file)
3. §4 FAB overlap (blocks §1's mobile UX)
4. §5 CTA/contrast tokens (systemic, small)
5. §6 GA4/GTM plumbing (needs `GTM_CONTAINER_ID` secret from you)
6. §3 Mobile cards behaviour
7. §7 Perf pass
8. §8 A11y sweep
9. §9 Launch QA tests + checklist

## What I need from you before build mode

1. **GTM Container ID** (format `GTM-XXXXXXX`) — I'll request via `add_secret`.
2. **Confirm CTA vocabulary** above (Signature/Studio labels) — one-way change, hits ~15 files.
3. **Free-cancellation window** for TrustStrip — is `48h` correct, or different per tour?
4. **Review `sourceUrl` data** — does every review currently have one? If not, I'll gate the icon behind presence.
