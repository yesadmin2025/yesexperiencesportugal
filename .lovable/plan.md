## Goal

Make the Livro de Reclamações badge appear as a white mark on a transparent background, and relocate it to the very bottom of the footer (below the copyright/legal bar) instead of sitting in the trust strip.

## Changes

1. `src/components/trust/LivroReclamacoesBadge.tsx`
   - Swap the asset from the "azul negativo" (white-on-blue block) variant to the `logo_LRE_preto positivo.png` variant (mark on transparent background) — uploaded via `lovable-assets` from the existing `LogosLRE.zip`.
   - Apply `filter: brightness(0) invert(1)` so the mark renders pure white on transparent, matching the charcoal footer. Keep hover opacity for affordance.
   - Update the doc comment to reflect the new variant + CSS-recolor approach.

2. `src/components/Footer.tsx`
   - Remove the `<li>` wrapping `<LivroReclamacoesBadge />` from the trust strip (around line 318–320).
   - Add a new discreet row at the very bottom of the footer, after the copyright/legal `nav` block (after line ~363), centered on mobile and right-aligned on desktop, with a small top margin so it reads as a final legal signature — not a trust brag.
   - No other footer content changes.

No copy, layout, or logic changes elsewhere. Reduced-motion and focus-ring behavior preserved.
