## Goal

The footer's legal complaints-book seal is currently the small square mark. Recolored to white it hides the word "LIVRO" behind the circle, it is too small, and on mobile the badge row sits awkwardly relative to the legal text. Replace it with the horizontal "LIVRO DE RECLAMAÇÕES" lockup you uploaded, cleaned so it reads in white, and restructure the footer's bottom legal block.

## What changes

1. **Prepare the asset**
   - Take the uploaded PNG and process it: drop the white circle behind "LIVRO" (make near-white pixels transparent), keep only the wordmark glyphs, and trim the empty margins so the artwork is tight to the letters.
   - Register the cleaned file as a CDN asset (`logo-livro-reclamacoes-wordmark.png.asset.json`); keep the old assets in place unused.

2. **Badge component (`src/components/trust/LivroReclamacoesBadge.tsx`)**
   - Point at the new wordmark asset with correct intrinsic width/height (wide, roughly 6:1).
   - Recolor to solid white via `brightness(0) invert(1)` plus a soft drop-shadow — with the circle removed, every letter stays legible.
   - Size it a step larger than today and scaled by viewport: about 150px wide on small phones, ~176px from 360px up, ~200px on desktop, height auto, `max-w-full` so it never overflows a 320px screen.
   - Keep the link to `livroreclamacoes.pt`, the aria-label, focus ring, 44px tap area, and the dev contrast assertion.

3. **Footer bottom block (`src/components/Footer.tsx`)**
   - Give the seal a clear final row: legal meta line first, then a hairline rule, then the centered badge as the last element in the footer on mobile (currently the mobile legal paragraph renders after the badge).
   - Consistent vertical rhythm (same padding above/below as the other footer rules) and centered on mobile, left-aligned from `md:` up to match the rest of the footer.

## Verification

- Screenshot the footer at 320, 393 and 1280px to confirm the wordmark is fully legible, not clipped, and vertically balanced.
- Confirm the "LIVRO" letters are visible (no dark disc) and the link still opens the official portal.
