## Current state

- `src/components/Logo.tsx` imports two WebP files and renders them via `<img>` with per-theme CSS filter recipes:
  - `src/assets/yes-logo-approved.webp` (117 KB) — teal-on-ivory (header)
  - `src/assets/yes-logo-approved-gold-silk.webp` (53 KB) — gold-on-charcoal (footer)
- Same logo also exists in `src/assets/` as PNG @1x/2x/3x for both color variants (6 PNGs, ~471 KB total) and one extra `yes-logo-approved-gold.png` (231 KB) — none of these are referenced by any code.
- `src/assets/yes-logo-teal.svg` (15 KB) and `src/assets/yes-logo-gold.svg` (15 KB) already exist with the exact locked palette hex values baked in (#295B61 teal, #2E2E2E charcoal, #C9A96A gold, #F5EFE6 ivory) — currently unreferenced by the app.
- `src/components/YesMark.tsx` + `src/assets/yes-mark-refined.webp` (56 KB) — component has no consumers.
- `public/brand/svg/` press kit stays untouched — it's the downloadable brand pack surfaced on `/press` and the site manifest, unrelated to header/footer runtime.

## One consistent format decision

Adopt **SVG** for the runtime logo in both header and footer. SVG is:
- resolution-independent (crisper than PNG @3x, one file replaces the whole 1x/2x/3x ladder)
- ~10× smaller than the WebPs currently shipping (15 KB vs 117 KB)
- already colored with the exact locked-palette hex values, so CSS filter recipes become unnecessary

Two color files are unavoidable (locked palette dictates it — a single artwork can't be legible on both ivory and charcoal without a filter hack): teal SVG on ivory, gold SVG on charcoal. Both are the **same file format** used in **both surfaces via the same component** — the interpretation of "one consistent asset" the request asks for.

## Changes

1. **`src/components/Logo.tsx`** — swap WebP imports for the SVG variants, drop the `width={909}`/`height={579}` raster-specific attributes:
   ```ts
   import logoTeal from "@/assets/yes-logo-teal.svg";
   import logoGold from "@/assets/yes-logo-gold.svg";
   const SOURCES = { "teal-on-ivory": logoTeal, "gold-on-charcoal": logoGold };
   ```
   Everything else (Navbar/Footer consumers, `logo-mark--*` class hooks, sizing via parent `className`) stays byte-identical.

2. **`src/lib/brand-tokens.ts`** — update the two filename constants that mirror the source list:
   - `"teal-on-ivory": "yes-logo-teal.svg"`
   - `"gold-on-charcoal": "yes-logo-gold.svg"`

3. **`src/styles.css`** — the `.logo-mark--teal-on-ivory` and `.logo-mark--gold-on-charcoal` `filter: var(--logo-filter-*)` recipes were compensating for the WebP not being exactly on-palette. With SVGs already at the locked hex, set both `filter: none` (keep the transform/scale tokens for optical sizing, and keep the reduced-motion branch intact). No token deletions — just neutralize the two filter declarations.

4. **Delete unused runtime duplicates** (app never imports these):
   - `src/assets/yes-logo-approved.webp`
   - `src/assets/yes-logo-approved-gold-silk.webp`
   - `src/assets/yes-logo-approved-gold.png`
   - `src/assets/yes-experiences-portugal-logo-{gold,teal}-{1x,2x,3x}.png` (6 files)
   - `src/assets/yes-mark-refined.webp` + `src/components/YesMark.tsx` (component has zero call sites)

## Not touched

- Locked brand palette — SVGs already contain the exact hex values, no color changes anywhere.
- `public/brand/svg/*` press kit (referenced by `/press`, `__root.tsx` favicon link, `site.webmanifest`).
- `src/assets/edit-market.jpg` and any non-logo asset.
- Navbar / Footer consumer code — same `<Logo theme=... className=... />` API.
