## Goal

Make the Livro de Reclamações badge larger and more prominent (matching the reference screenshot), well-structured and legible on mobile, while keeping it integrated in the footer's legal zone.

## Changes

1. `src/components/trust/LivroReclamacoesBadge.tsx`
   - Increase rendered height from `h-[22px]` to `h-[36px]` on mobile and `sm:h-[42px]` on tablet/desktop (roughly 1.7–1.9× current), keeping `w-auto` so the aspect ratio stays correct.
   - Keep white filter + drop-shadow, hover opacity, focus ring and dev-only WCAG contrast assertion (AAA graphic) unchanged.

2. `src/components/Footer.tsx` (around lines 368–373)
   - Split the current single legal row into two rows:
     - Row A: `LanguageSwitcher` on its own (left on desktop, centered on mobile), same styling as today.
     - Row B: a dedicated centered block for `<LivroReclamacoesBadge />` with `mt-6` top spacing and `pt-5 border-t border-[color:var(--gold-warm)]/10` so it reads as a distinct legal signature — visually matching the standalone framed area in the reference screenshot.
   - Ensure the badge row is centered on all viewports (`flex justify-center`) so it feels like an official legal seal, not a tacked-on strip.

No copy, color-token, routing or logic changes. Reduced-motion and A11y behavior preserved.
