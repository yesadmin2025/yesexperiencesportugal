## 1. Tailor page — unreadable overlay on the hero card

**File:** `src/routes/tours.$tourId.tailor.tsx` (lines 671–694)

The mini cover card currently overlays the full italic `tour.blurb` paragraph on top of the image (plus a `Signature` badge and region/duration). On tall blurbs (Setúbal Arrábida in the screenshot) the italic serif runs over the vineyard, becoming illegible — and it duplicates the intro paragraph rendered directly above the card ("You're tailoring X. The route, story and trusted local guide remain intact…").

**Change:**
- Remove the italic `tour.blurb` line from the image overlay — it's redundant with the intro paragraph and it's what's making the image unreadable.
- Keep the `Signature` badge and the region / duration meta strip so the card still communicates provenance at a glance.
- Soften the bottom gradient (shorter, lower opacity) since it no longer needs to darken a full paragraph — just enough to keep the badge + meta line legible.

No copy, layout, or component changes elsewhere on the tailor page.

## 2. Southwest Vicentine Coast — missing gallery photos

**Files:** `src/lib/tour-gallery.ts` and `src/data/signatureToursViator.ts`

Root cause: the tour has only **one** entry in `meta.localGallery`, and `getTourGallery` returns *only* the local set when it exists. The gallery section on `/tours/southwest-vicentine-coast` requires `photos.length >= 3` to render, so it silently collapses — matching the "no images here" report.

**Change (two parts):**

**a. `getTourGallery` — fall through to Viator when the local set is thin.**
When `localGallery.length < 3`, return the local photos first, then append the `meta.gallery` (Viator) URLs, deduped by src, with the same synthesised alt-text pattern already used in the fallback branch. This keeps editor-written local alts as the leading covers, while ensuring every tour reaches the 3-photo threshold and the gallery block always renders. Tours with a full local set behave exactly as today.

**b. Refresh the southwest tour's Viator gallery URLs.**
The current `gallery` array points at generic `media.tacdn.com/attractions-splice-spp` thumbnails (not tied to this specific Viator product 349639P16). Replace them with the real hero + supporting shots pulled from the linked Viator page so the gallery reads as this tour, not generic Alentejo stock. I'll fetch the Viator page and take the top 4–5 product photos; if Viator blocks scraping in-session, I'll fall back to keeping the existing URLs and just wire the fall-through in (a) so at least all six images render — and flag it for a follow-up upload of real YES photos.

## Out of scope
- No changes to other tours' galleries, no changes to the hero cover on the tour page, no changes to price/copy.
- No new `localGallery` uploads in this change (that needs real photos from the operator).
