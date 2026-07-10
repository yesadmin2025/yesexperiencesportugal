# Add on-brand og:image + twitter:image to priority routes

## Context
Codebase scan found zero `storage.googleapis.com/gpt-engineer-file-uploads` URLs anywhere in `src/`, `public/`, or `index.html`. What the SEO scanner is likely flagging is that the priority routes ship no `og:image` / `twitter:image` at all, so social crawlers fall back to a hosted default (which on Lovable can be a `storage.googleapis.com` screenshot). Fix = give each route its own branded share image on the same origin.

Existing routes `/` (heroImg), `/multi-day`, `/proposal-in-portugal`, `/corporate`, `/tours/*`, `/tours/*/tailor`, `/press`, `/local-stories/$slug` already have branded og/twitter images — leave them alone.

## Route → image mapping (all Vite-imported, served from `/assets/…` on our domain)
- `/studio-v3` → `src/assets/decision-studio.jpg` (Studio composition — matches the composer promise)
- `/about` → existing `src/assets/about-founder-wine-experience.jpg.asset.json` (CDN pointer, already on our infra)
- `/experiences` → `src/assets/hero-coast.jpg` (Signature collection editorial hero)
- `/contact` → `src/assets/why-image.jpg` (warm, human, on-brand)
- `/terms` → `src/assets/hero-coast.jpg` (brand-neutral coastal hero; legal page, no bespoke image needed)
- `/local-stories` (index route `local-stories.index.tsx`) → `src/assets/edit-viewpoint.jpg` (editorial mood matching Local Stories)
- `/proposal-in-portugal` → already uses `imgRomantic`; verify it's absolute-URL wrapped and add matching `twitter:image` if missing.

All images are already premium landscape brand photography ≥1200px wide, so they satisfy the ~1200×630 social-preview requirement (crawlers accept larger; center-crop). No new imagery generated (user picked "Add on-brand og:image + twitter:image" over regeneration).

## Implementation (meta only, no visual changes)
For each route above, inside the existing `head()` `meta` array add:
```ts
{ property: "og:image", content: `https://yesexperiencesportugal.com${routeImg}` },
{ property: "og:image:width", content: "1200" },
{ property: "og:image:height", content: "630" },
{ property: "og:image:alt", content: "<route-appropriate alt>" },
{ name: "twitter:card", content: "summary_large_image" },
{ name: "twitter:image", content: `https://yesexperiencesportugal.com${routeImg}` },
```
Import the image at the top of each route file:
```ts
import ogImg from "@/assets/<file>.jpg";
```
For `/about`, use the existing `.asset.json` pattern already in the file (`founderAsset.url`) — prefix with `BASE_URL` if it starts with `/`, or use as-is if already absolute (CDN pointer URLs are `/__l5e/…`, so they need the domain prefix).

For `/proposal-in-portugal`, add the `twitter:card` + `twitter:image` pair alongside the existing `og:image` (currently only OG is set).

No canonical or URL changes. No JSON-LD changes. No component/JSX changes. Palette untouched.

## Files edited
- `src/routes/studio-v3.tsx`
- `src/routes/about.tsx`
- `src/routes/experiences.tsx`
- `src/routes/contact.tsx`
- `src/routes/terms.tsx`
- `src/routes/local-stories.index.tsx`
- `src/routes/proposal-in-portugal.tsx` (add missing `twitter:image` only)

## Verification
1. `rg -n "storage\.googleapis\.com/gpt-engineer" .` → still zero (was zero before too).
2. `rg -n "og:image" src/routes/{studio-v3,about,experiences,contact,terms,local-stories.index,proposal-in-portugal}.tsx` → each returns a hit pointing at `https://yesexperiencesportugal.com/assets/…`.
3. Build succeeds (`bun run build`).
4. Tell the user: previously scraped previews stay cached until each platform re-fetches; use the Facebook/LinkedIn/Twitter debug tools to force a refresh.

## Out of scope
- Regenerating bespoke 1200×630 stills per route (offered, user declined).
- Any visual/layout/palette changes.
- Routes already carrying og:image (home, multi-day, corporate, tours, press, local-stories/$slug).
