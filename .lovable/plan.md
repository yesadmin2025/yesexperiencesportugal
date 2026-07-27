## What's happening

The seal file itself is fine — the current image serves correctly (HTTP 200, 16 KB PNG) from the preview domain. What you're seeing is the **previous** seal file, which was replaced during the last redesign. Any tab or build still pointing at the old file gets a broken image, and because the badge has no fixed height, the broken placeholder expands into that tall empty box.

## Fix

1. **Force the new seal through**
   - Hard-refresh the preview so the page picks up the current asset pointer instead of the retired one.
   - Republish so the live site stops referencing the retired file.

2. **Make the badge fail gracefully**
   - Constrain the image with an explicit height (not just width) so it can never blow up into a large empty box if an asset ever 404s again.
   - Hide the broken-image state (`onError`) instead of showing alt text in a bordered frame, keeping the "Livro de Reclamações" link accessible via its `aria-label`.

3. **Make it slightly smaller**
   - Mobile: 180px → 150px wide.
   - Desktop: 210px → 175px wide.
   - Keeps the 44×44 minimum tap target intact.

## Verification

Capture the footer at mobile (393px) and desktop widths to confirm the seal renders crisp white, is correctly centered, and sits at the reduced size.
