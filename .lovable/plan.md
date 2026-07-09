## Current state

- `src/components/Footer.tsx` is already the single shared footer, mounted once via `SiteLayout` (which every route wraps in). No route renders its own footer or its own payment row.
- `PaymentMethodsRow` is used only inside `Footer.tsx` — payment-icon set is already identical everywhere.
- Link columns (Experiences / Occasions / Company / Connect), Popular searches, and Signature Experiences lists live in this one file → already identical across routes.

## Real divergences to fix (within the single footer)

1. **License reference repeats 3×**
   - Brand tagline paragraph: "Licensed tour operator RNAAT nº 31/2023 · Based in Sesimbra, designing private journeys across Portugal."
   - Trust strip badge: "RNAAT nº 31/2023"
   - Bottom legal line: "RNAAT nº 31/2023 · Sesimbra, Portugal"
2. **"Based in" location repeats 2×** (tagline + bottom legal line), with two different phrasings.
3. **Divider hairline inconsistency**
   - Popular searches / Signature Experiences / trust strip separators: `border-[color:var(--gold-warm)]/15`
   - Bottom bar separator: `border-[color:var(--gold-warm)]/25`

## Changes (`src/components/Footer.tsx` only)

1. **Tagline paragraph** — strip the credential clause. Leave the brand-voice sentence only:
   > "Private Portugal, shown the way a local shows a friend. Intimate, real, and genuinely different — designed with you and confirmed in minutes. 700+ five-star reviews."
   (Removes both the license mention and the "Based in…" clause from the tagline; both remain elsewhere in canonical positions.)

2. **Trust strip badge (canonical license reference)** — keep `RNAAT nº 31/2023` badge unchanged. This is the single visible license reference.

3. **Bottom legal line (canonical location reference)** — keep `© {year} YES experiences Portugal. All rights reserved.` and reduce the meta suffix to just the location, since the license already appears in the trust strip directly above:
   - Desktop suffix: ` · Sesimbra, Portugal.`
   - Mobile secondary line: `Sesimbra, Portugal.`
   - Update `LEGAL_META_LINE` accordingly (remove `${LICENSE_LABEL} · ` prefix; keep `${BASED_IN}`).

4. **Divider consistency** — set all four inner section separators (Popular searches, Signature Experiences, trust strip, bottom bar) to the same token: `border-t border-[color:var(--gold-warm)]/15`. Change bottom-bar `/25` → `/15`.

## Not touched

- Brand palette / any hex or CSS variable (locked palette preserved: charcoal ground, ivory text, gold-warm hairlines, gold-soft hover).
- `src/config/business-nap.ts` constants (single source of truth stays intact; only the local `LEGAL_META_LINE` template in Footer changes).
- `PaymentMethodsRow` markup and icon set.
- Link columns, Popular searches list, Signature Experiences list, legal-nav items.
- `SiteLayout` mounting (already single point of use).
