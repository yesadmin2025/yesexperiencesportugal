## Goal

Bring pricing transparency, mobile clarity and site-wide craft up to the premium bar — across Studio V3, Signature pages, Tailor form and the rest of the site.

---

## 1. Pickup time (Studio + Signature + Tailor)

Add a shared `PickupTimeField` primitive (`src/components/ui/PickupTimeField.tsx`):

- Shows a **suggested pickup window** per tour (e.g. "9:00 – 9:30") pulled from tour data (fallback: "8:30 – 9:30").
- Chip: `Use suggested` (default active) + `Choose a time` toggle → reveals a native `time` input (mobile-friendly).
- State lives at the composer level; passes into checkout payload as `pickupTime` or `"suggested (window)"`.

Wire into:

- `StudioV3` refine phase (below date/guests).
- `SimpleTailorForm` (new Field between Date and Guests).
- `SignaturePriceCard` — shows `Pickup · 9:00 (suggested)` as a subtle row above the traveller ledger.
- `BrandedCheckoutDrawer` — reads `pickupTime` into the summary and outbound payload.

Data: extend `SignatureTour` type with optional `pickupWindow?: { from: string; to: string }`; add to existing signature tour records (fallback constant when absent).

---

## 2. Per-band pricing table (Studio + Signature + Tailor)

Replace the current "average per person" summary with an explicit **age-band price table** shown above the total.

New primitive `AgeBandPriceTable` (`src/components/pricing/AgeBandPriceTable.tsx`):

```
Adult      €240   [× 2]  ← highlighted (selected)
Youth 13–17 €180
Child 4–12  €120   [× 1]  ← highlighted (selected)
Infant 0–3  Free
```

- Highlighted row = band present in current party (soft `--gold-soft` background, `--charcoal` text).
- Non-selected bands stay visible but muted (`--charcoal-soft`).
- Renders below the description on Signature pages (moved out of the confusing "average" block).
- Reused in `SignaturePriceCard`, `SimpleTailorForm` estimate block, and Signature tour hero pricing section.

Removes: the averaged "€X per person" copy underneath tour descriptions.

---

## 3. Minor-age selection clarity

In Studio V3 guest picker and Tailor:

- Replace ambiguous "Child" counter with a **per-minor age row**: each minor rendered as `Minor 1 [age select 0–17]` with the band auto-labeled (`Infant · free`, `Child · €120`, `Youth · €180`) inline in `--teal`.
- Typography: age label `text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]`; band chip `text-[12px] text-[color:var(--teal)]` (fixes current low-contrast).
- Prevents adding a minor without an age (disabled `Next` + inline hint).

---

## 4. Studio post-story CTA rename

Rename `CTA_email my story` → **"Confirm & reserve"** in `src/content/signature-day-copy.ts`.

- Keep the alias export for backwards compat.
- Update tests referencing the old label.
- Verify all surfaces: FinalRevealStory, mobile sticky bar, storytelling screen.

---

## 5. Mobile alignment pass (Studio + Signature + Tailor)

Apply responsive-layout-patterns rules:

- Convert header rows using `flex flex-wrap` → `grid grid-cols-[minmax(0,1fr)_auto]` with `min-w-0` + `shrink-0`.
- Studio refine card, checkout summary, Signature price card: audit each `<header>` and pricing row at 393px.
- Sticky bottom CTA on Studio + Signature + Tailor booking flows (44px min tap targets, safe-area padding).
- Guest details form: single-column, larger touch targets, clearer field grouping.

---

## 6. Site-wide polish

### 6a. Image dedupe + upgrade

- Audit `src/assets/` + Signature tour images for duplicates across routes (home, /about, Signature tours, /multi-day, /studio-v3).
- Build an image-usage report (script `scripts/audit-image-usage.mjs`).
- Replace duplicates with unique editorial shots from the owner-photos library; commission new via `imagegen` or real images from tours
- All new images uploaded via `lovable-assets` and referenced via `.asset.json` pointers.

### 6b. Homepage-parity animations on inner pages

- Extract `.home-energy` motion utilities into a reusable `page-energy` scope OR broaden the class allowlist. Add more premmium animations focused on conversion 
- Apply sequenced reveals and homepage animations (fade + translateY 12–16px, ≤450ms cap), hover lift -3px, gold sheen on primary CTAs to: /about, Signature tour pages, /multi-day, /studio-v3, /tailor.
- &nbsp;

### 6c. Animated CTA arrows

- Update `CtaButton` primitive: arrow uses `translate-x-0 group-hover:translate-x-1 transition-transform duration-300 ease-out`; on primary variant add subtle continuous idle nudge (`animate-[arrow-nudge_2.4s_ease-in-out_infinite]`, 3px amplitude, paused on hover, disabled by `prefers-reduced-motion`).
- Add `@keyframes arrow-nudge` to `styles.css`.

### 6d. Typography, contrast, spacing

- Audit all pages routes for:
  - Body copy contrast (must clear 4.5:1 on `--ivory` / `--sand`; fix any `text-[color:var(--charcoal-soft)]` on light surfaces below spec — bump to `--charcoal` or darken the soft token by ~6%).
  - Section rhythm: enforce `py-16 md:py-24` (skill §13).
  - Heading scale on inner routes to match homepage editorial rhythm.
  - Label typography (≥10.5px, tracking 0.22em) on all eyebrows.
- Add ESLint/style regression: existing brand-audit script gets new rules for these thresholds.

---

## Technical notes

- New files: `src/components/ui/PickupTimeField.tsx`, `src/components/pricing/AgeBandPriceTable.tsx`, `scripts/audit-image-usage.mjs`.
- Edited primitives: `SignaturePriceCard`, `SimpleTailorForm`, `StudioV3`, `FinalRevealStory`, `CheckoutSummary`, `BrandedCheckoutDrawer`, `CtaButton`, `styles.css`, `signature-day-copy.ts`.
- Data: extend `SignatureTour` type + tour records with `pickupWindow` and confirm per-band pricing already exists (via `signatureTourPricing`).
- Tests: update existing checkout / final-reveal tests for the renamed CTA + new pickup row; add tests for age-band table rendering and pickup time round-trip.
- No backend / schema changes.

---

## Rollout order (single plan, executed in one build cycle)

1. Copy + type + data changes (safe, no visual impact yet).
2. Primitives (`PickupTimeField`, `AgeBandPriceTable`, `CtaButton` arrow motion).
3. Wire into Studio → Signature → Tailor → Checkout.
4. Mobile alignment pass across those surfaces.
5. Site-wide polish (images, motion parity, contrast/spacing).
6. Test + brand-audit run.