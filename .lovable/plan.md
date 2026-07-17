## Goal
Add the 10 uploaded photos to the site as **general brand imagery** — extending the existing `GuestMomentsStrip` system (real, owner-supplied moments used on Homepage / About / Corporate / Multi-day), not tied to any Signature tour.

## Photo reading & proposed captions
Each caption stays in the existing editorial voice (short, sensory, specific, no invention).

| # | File | Scene | Proposed caption |
|---|---|---|---|
| 1 | 1000028943 | Group tasting inside a Setúbal barrel cellar, host pouring | *In the barrel room, wine tells its own story.* |
| 2 | 1000028925 | Master tile-painter tracing a hand-drawn azulejo in his Azeitão workshop | *A tile, drawn by hand — the way it has always been done.* |
| 3 | 1000028901 | Couple with white wine + petiscos board at the winery patio | *A glass, a board of petiscos, no rush at all.* |
| 4 | 1000028886 | Couple kissing on the Portinho boardwalk, Tróia sandbar below | *Above Portinho — the view no one wants to leave.* |
| 5 | 1000022999 | Guide presenting the giant 20,000-litre Moscatel oak vats | *Twenty thousand litres, aging quietly since 1834.* |
| 6 | 1000022539 | Artisan hand-painting a blue cat on a raw ceramic tile | *One brush, one cat, one afternoon in Azeitão.* |
| 7 | 1000021672 | Aerial of Portinho da Arrábida — turquoise bay, anchored boats | *Portinho da Arrábida — Portugal's quiet Caribbean.* |
| 8 | 1000021461 | Full tasting flight — white, Moscatel, aged tawny | *A full flight — from crisp white to aged Moscatel.* |
| 9 | 1000020224 | Large private group selfie with guide, arriving at Sintra | *Sintra mornings — the whole group, one story.* |
| 10 | 1000019828 | Two women at Serra da Arrábida viewpoint, Tróia sandbar beyond | *The Serra viewpoint — Tróia stretching out below.* |

If any caption feels off after seeing them in context, we tweak in a follow-up.

## Implementation

1. **Upload** all 10 photos as Lovable CDN assets under `src/assets/owner-photos/` (same convention as existing moments):
   ```
   lovable-assets create --file /mnt/user-uploads/<name>.jpeg --filename <slug>.jpeg > src/assets/owner-photos/<slug>.jpeg.asset.json
   ```
   Slugs: `barrel-cellar-tasting`, `azulejo-master-painter`, `couple-petiscos-patio`, `portinho-boardwalk-couple`, `moscatel-giant-vats-guide`, `azulejo-blue-cat`, `portinho-aerial-bay`, `tasting-flight-full`, `sintra-group-selfie`, `arrabida-viewpoint-women`.

2. **Extend `src/content/guest-moments.ts`** — import the 10 new asset pointers, add 10 `MOMENT_*` exports with the captions above.

3. **Refresh the curated sets** so each surface shows a stronger mix (no other component changes needed — sets flow through `GuestMomentsStrip` on Homepage, About, Corporate, Multi-day):
   - `HOMEPAGE_MOMENTS` (5) → couple on boardwalk, aerial Portinho, barrel cellar tasting, tile master painting, couple with petiscos.
   - `ABOUT_MOMENTS` (4) → Sintra group selfie, Arrábida viewpoint women, tile painter, existing tasting-cake.
   - `CORPORATE_MOMENTS` (3) → Sintra group selfie, barrel cellar tasting, existing wine-cheers.
   - `MULTI_DAY_MOMENTS` (4) → aerial Portinho, tasting flight, Moscatel giant vats, blue-cat azulejo.
   - Existing moments stay defined (not deleted) so nothing else breaks.

4. **Verify**: build passes, then quick Playwright screenshot of the homepage Moments strip + About page to confirm the new photos render at 4:5 with captions.

## Out of scope
- No new tour_gallery_photos rows, no `tour-photos` bucket uploads (these are brand imagery, not tour-scoped).
- No changes to `GuestMomentsStrip` component or motion.
- No copy changes elsewhere.
