# Focused Hero and Experiences editorial pass

## Scope
Refine only the homepage Hero and `/experiences` collection presentation. Preserve the existing film, approved copy, Premium System Lock, routes, tour data, prices, business logic, metadata, and reduced-motion behavior.

## Implementation
- Re-sequence the Hero into five restrained cinematic beats using existing motion tokens: eyebrow, first headline line, second headline line, positioning sentence, primary action, then secondary action.
- Keep both actions interactive throughout, remove the two lower micro-links from the first viewport, create more breathing room, and add a subtle bottom fade into the ivory page.
- Simplify `/experiences` into a two-column desktop and one-column mobile editorial collection with consistent image ratios, one essence sentence, one compact metadata line, quiet ratings, and one detail-page action.
- Remove collection-only highlight bullets and the competing Tailor action without changing underlying tour data or detail-page capabilities.
- Add one restrained 300–450ms card reveal with light staggering and reduced-motion fallback; avoid continuous or theatrical effects.
- Update only focused assertions affected by the intentional Hero/card DOM changes.

## Verification
- Run focused Hero CTA, typography, reveal, and reduced-motion checks.
- Run directly affected Experiences checks and the mobile overflow guard.
- Run typecheck and production build.
- Check the live preview at 393px and desktop for hierarchy, overflow, CTA access, and console errors.
- Do not deploy.
