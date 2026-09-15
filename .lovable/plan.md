# Polish the homepage Hero and cookie notice

## Goal
Make the mobile opening feel composed, cinematic, and expensive while fixing the broken cookie presentation. Preserve the road film, fixed ivory top bar, approved copy, destinations, analytics, and brand palette.

## Changes
- Replace the current uneven phrase motion with one restrained 1.4-second sequence: eyebrow, masked first line, signature line 120ms later, supporting copy, then actions.
- Remove blur, sideways motion, scale effects, and conflicting legacy animation rules from the Hero.
- Refine the supporting text with a calmer reading width, stronger contrast, cleaner line-height, and balanced mobile wrapping.
- Rework the primary action into a quieter editorial button with a fine border, controlled ivory surface, precise type, and a subtle arrow glide; keep a full 44px+ tap target.
- Give the secondary action clearer spacing and hierarchy without competing with the primary action.
- Rebuild the mobile cookie notice as a compact bottom sheet with contained text and a clean two-level action layout so no label clips or escapes the panel.
- Keep preferences accessible, retain all consent choices, and disable decorative motion for reduced-motion visitors.

## Verification
- Check the opening at 393×596 and a taller phone viewport, including the cookie notice open and preferences expanded.
- Confirm both headline lines reveal in sequence, all actions remain visible and tappable, and nothing overlaps or overflows.
- Confirm video autoplay, muted, loop, playsInline, poster fallback, routes, analytics, and reduced-motion behavior remain intact.
- Run focused Hero, typography, consent, and mobile interaction checks. Publishing remains separate.
