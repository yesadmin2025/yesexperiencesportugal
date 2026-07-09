## Current state

- `src/components/Navbar.tsx` is already the single shared header, mounted via `SiteLayout` on every public route. There is no per-route header divergence — the same `desktopLinks`/`mobilePrimaryLinks` render everywhere.
- Real divergence is the **label + link for the Proposals surface**:
  - Navbar (desktop + mobile primary): `"Moments"` → `/proposal-in-portugal`
  - Homepage `ThreePathsSection` card: `"Moments"` → `/proposal-in-portugal`
  - Footer "Occasions" column: `"Proposals & Celebrations"` → `/proposal-in-portugal`
  - Footer "Popular searches": `"Proposal in Portugal"` → `/proposal-in-portugal`
  - i18n `nav.moments` = `"Moments"` (all locales)
  - Redirects already funnel `/moments` and `/proposals` → `/proposal-in-portugal` (canonical URL is fine, no change needed).

## Decision

- **Label**: `Moments` — matches Navbar, homepage card, and i18n key already in place; shorter, editorial, on brand.
- **Canonical URL**: `/proposal-in-portugal` (keyword-targeted route already used everywhere; SEO-friendly; existing redirects preserve inbound links).

## Changes

1. **`src/components/Footer.tsx`**
   - "Occasions" column: rename first item `"Proposals & Celebrations"` → `"Moments"` (link unchanged: `/proposal-in-portugal`).
   - "Popular searches": leave `"Proposal in Portugal"` as-is — it's an SEO long-tail keyword phrase, not a nav label, and points at the same canonical URL. (Call this out; if you'd rather I also relabel it "Moments" for absolute uniformity, say so.)

2. **`src/components/Navbar.tsx`** — no change (already `"Moments"` → `/proposal-in-portugal` in both desktop and mobile arrays, in the same order).

3. **Verify no other header exists**: `SiteLayout` is the only mount point for `<Navbar />`; every public route wraps in `<SiteLayout>`. No route renders its own header. No code changes needed here beyond a grep confirmation during implementation.

## Not touched

- Brand palette tokens — no hex or CSS variable changes.
- Route files, redirects, and canonical URLs.
- Homepage `ThreePathsSection` card (already "Moments").
- i18n JSON (already `"Moments"` in en/es/pt).
