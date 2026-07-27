## Goal

Two things: use the official lockup **with the circular symbol** (as in your image) instead of the plain wordmark, and rebuild the footer so it reads as one designed block instead of six stacked strips separated by hairlines.

## 1. Legal seal — correct lockup

The current footer uses a stripped wordmark where the white circle was deliberately removed. Your image shows the correct official lockup: white circle + "LIVRO DE" sitting over it + "RECLAMAÇÕES".

- Process your uploaded file: crop tight to the artwork, remove the dark background to full transparency, keep the white circle and white glyphs intact, export as a transparent PNG.
- Upload as a CDN asset and replace the wordmark pointer used by `LivroReclamacoesBadge`.
- Render at a legible size (about 180px mobile / 210px desktop wide), no CSS filters other than the subtle shadow, 44px minimum tap area, link to livroreclamacoes.pt in a new tab.

## 2. Footer redesign — from six strips to three zones

Today the footer stacks seven blocks, each with its own `border-t` hairline and its own alignment (some centered, some left) — that's what makes it feel scattered, especially on mobile.

New structure, one consistent alignment rule (left on desktop, centered only where a row is a single element):

```text
ZONE A — BRAND
  logo · one-line tagline · social icons

ZONE B — NAVIGATE  (single hairline above)
  Experiences | Occasions | Company | Legal   (4 cols desktop, 2 cols mobile)
  Popular searches + Signature Experiences become
  collapsible <details> groups on mobile, open lists on desktop
  → keeps every SEO link crawlable, removes the endless mobile scroll

ZONE C — TRUST & LEGAL  (single hairline above)
  credentials row (licence · Turismo de Portugal · secure checkout)
  payment methods
  "Also listed on" partner icons
  ─────────────────────────────
  © line · legal links · language switcher
  Livro de Reclamações seal, centered, as the closing signature
```

Design rules applied throughout:
- One hairline weight only (`--gold-warm`/15), used just twice — no hairline between every sub-block.
- One vertical rhythm: 40px between zones, 24px inside a zone, 12px between list items.
- All eyebrow headings identical (11px, uppercase, 0.32em, gold-warm, 600).
- Mobile: everything left-aligned in a single column except the closing seal; no mixed center/left rows.
- Icon rows share one pill style and 44px targets.

## Technical notes

- Asset processing with Python/PIL from the uploaded image, published via the assets CLI as `logo-livro-reclamacoes-lockup.png.asset.json`; the old wordmark pointer is deleted.
- `src/components/trust/LivroReclamacoesBadge.tsx` — new asset, new intrinsic dimensions, updated sizing; keeps the dev contrast assertion.
- `src/components/Footer.tsx` — restructured into `FooterBrand`, `FooterNav`, `FooterTrust` sections inside the same file; link data and all existing routes unchanged.
- Mobile collapsibles use native `<details>/<summary>` so links stay in the DOM for crawlers.
- Verification: Playwright screenshots at 320 / 393 / 768 / 1280 px, plus a check that every current footer link is still present.

No copy, routes, or business logic change — this is layout, hierarchy, and the seal asset only.</content>
</invoke>
