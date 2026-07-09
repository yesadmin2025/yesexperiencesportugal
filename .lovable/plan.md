# Review Source Icon — Clickability Audit & Plan

## Where the source icons live

- `src/components/home/GuestQuotes.tsx` → `SourceBadge` (lines 272–319). Homepage review carousel. Tripadvisor renders as a 28×28 circular icon; other sources as a tiny text pill. Wrapped in `<a target="_blank">` when `source_url` exists.
- `src/components/TourReviews.tsx` (lines 110–136). Per-tour review grid. **Currently has NO clickable source at all** — only a static "via Tripadvisor" text label. Bigger gap than the homepage.

## Current weaknesses

1. **No visual affordance of interactivity.** The Tripadvisor badge on the homepage card is a flat 28×28 disc with a static border. No cursor pointer class, no hover state, no focus ring, no external-link cue. It reads as decoration, not a link.
2. **Tap target below 44px on mobile.** 28×28 with no extra padding fails Apple/WCAG minimum; users near the card edge will mis-tap the swipe area instead.
3. **Silent when `source_url` is missing.** Same visual whether linked or not — users learn "it doesn't do anything" and stop trying.
4. **Ambiguous label.** `aria-label="Read this review on Tripadvisor"` is fine for SR users, but sighted users get no tooltip/microcopy — they don't know it's *this* review, not the generic profile.
5. **Carousel swipe conflict.** The icon sits in the bottom-right of a horizontally-swipeable card with no click-vs-drag guard; a slow tap during a scroll can register as a click and yank the user away.
6. **TourReviews has no link at all.** The "via Tripadvisor" caption is inert text — a strictly worse experience than the homepage, and inconsistent.
7. **No focus-visible ring.** Keyboard users can't see the badge take focus.
8. **Non-Tripadvisor sources are text pills** with the same passive treatment — same issues, quieter.

## Recommendation

**Keep icon-only** on the card (protects the editorial calm). Add:
- desktop tooltip on hover ("View original on Tripadvisor")
- descriptive aria-label ("View {reviewer}'s review on Tripadvisor") for SR
- a small external-arrow glyph that fades in on hover/focus only

No always-visible microcopy on the card — it would push the layout toward a booking-widget feel.

## Micro-interaction system (aligns with existing motion tokens)

| State | Change | Timing | Easing |
|---|---|---|---|
| Rest | 28×28 disc, `border-charcoal/10`, `bg-ivory` | — | — |
| Hover (desktop) | border → `--gold`, bg → white, scale `1.03`, tiny `↗` glyph fades in at 0.7 opacity, tooltip after 400ms delay | 180ms | `cubic-bezier(.2,.7,.2,1)` |
| Focus-visible | 2px gold ring, 2px offset | 120ms | ease-out |
| Active/tap | scale `0.97`, bg → `--sand` | 90ms in, 160ms out | ease-out |
| Entrance | one-time fade + 4px rise when card enters viewport (respect existing `he-card-lift`) | 260ms | ease-out |
| Reduced motion | remove scale + entrance; keep color/tooltip only | — | — |

No pulsing, no loop, no autoplay motion. Matches the site-wide ≤220ms rule.

## Mobile specifics

- **Bump hit area to 44×44** via `p-2 -m-2` around the 28×28 disc so the visual size is unchanged.
- **Swipe-safe click:** add a pointerdown/pointerup guard — cancel navigation if the pointer moved >8px between down and up (prevents accidental open while swiping the carousel). Small utility hook, reusable.
- **Tap feedback:** `active:scale-[.97] active:bg-[color:var(--sand)]` — instant, no delay, no ripple.
- **Only the active (snapped) card's icon gets full opacity;** neighbors stay at 85% so the user's thumb naturally targets the centered card. Uses `activeIndex` state already tracked in `ReviewCarousel`.
- **No tooltip on mobile** (no hover); rely on aria-label + the external-arrow glyph, which becomes always-visible at ≤sm as the "this is a link" cue.

## Copy / label decision

- **Card face:** icon only (keep editorial calm).
- **Desktop:** Radix/shadcn `Tooltip` reading "View original on Tripadvisor" (or platform label).
- **SR/aria:** "View {reviewer_name || 'this'} review on Tripadvisor (opens in new tab)".
- **Mobile visible cue:** the small `↗` external-link glyph, 8px, gold, next to the badge — always shown on touch devices, hover-only on desktop.

## Accessibility

- `<a>` with `href={source_url}` `target="_blank"` `rel="noopener noreferrer"`.
- Descriptive `aria-label` including reviewer name where available.
- Visible focus ring (currently missing).
- Announce external navigation in the label ("opens in new tab").
- If `source_url` is null: render as a non-interactive `<span>` with `aria-hidden` on the arrow — no dead links.

## Affected files

- `src/components/home/GuestQuotes.tsx` — refactor `SourceBadge` (only component change).
- `src/components/TourReviews.tsx` — add a `SourceLink` at the card footer using the same primitive.
- **New:** `src/components/ui/ReviewSourceLink.tsx` — shared primitive (icon + tooltip + swipe-safe click + a11y). Single source of truth so both surfaces stay consistent.
- `src/styles.css` — one small `@utility` for the swipe-safe active/hover states if it can't be expressed cleanly with Tailwind arbitrary values (likely not needed).

## Implementation complexity

Low. ~1 new small component, 2 call-site swaps, no data changes, no schema changes, no new deps (Radix Tooltip already present via shadcn).

## Risk

**Low.** Purely presentational + an existing anchor. No routing, no auth, no data. Worst case = a minor visual regression easily reverted. Zero risk to booking flow.

## Safest first step (highest confidence, ships value immediately)

**Step 1 (ship alone, verify, then continue):**
Create `ReviewSourceLink` and drop it into `GuestQuotes` only. Deliver in that first pass:
- 44×44 hit area via padding
- cursor-pointer, hover border→gold, scale 1.03, focus-visible ring
- swipe-safe click guard
- descriptive aria-label with "opens in new tab"
- external-arrow glyph (always on mobile, hover on desktop)

Skip tooltip, active-card opacity dimming, and TourReviews adoption until after visual QA on mobile. Those become Step 2 and Step 3 — each independently revertable.

## What NOT to do

- No always-visible "Verified on Tripadvisor" label under the icon (drifts toward badge-spam).
- No card-wide click target (breaks swipe, hurts the calm).
- No pulsing/glow to "teach" the affordance — hover + arrow glyph is enough.
- No changes to card layout, typography, or spacing.
