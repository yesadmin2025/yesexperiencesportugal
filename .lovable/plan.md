## Goal

Two shipped outcomes:

1. **Richer JSON-LD image data** so Google's crawler understands what each tour and itinerary stop *looks like* — full gallery arrays, per-stop images, and dedicated `ImageObject` nodes with captions.
2. **Real photos** on the plan hub pages, corporate, moments and homepage — no stock, no repeated hero. The 5 uploaded photos become part of a reusable pool (`experience_images` in the database) and are placed on their best-fit pages.

---

## What changes for you

**Plan hub pages (Arrábida, Comporta, Alentejo, Wine & Gastronomy, Lisbon, Sintra, Costa Vicentina)** currently have no photography — text-only. They get a real hero image + a small editorial gallery strip below the standfirst, drawn from real Signature-tour photos + your uploads. The vineyard-couple photo anchors the Wine & Gastronomy page; the Arrábida viewpoint anchors Arrábida; the Bubbling wine tasting anchors Setúbal/Wine; the chocolate-cake tasting anchors Wine & Gastronomy; the quinta group anchors Comporta/Alentejo.

**Corporate, moments, homepage** get a targeted audit — any stock-looking or duplicate hero gets swapped for a real Signature or guest photo.

**Google / search** now sees:
- Every tour page: `image` array (hero + full gallery) plus an `ImageGallery` node with per-photo `ImageObject` entries (contentUrl, caption, creditText).
- Every itinerary stop in the `TouristTrip.itinerary`: an `image` matched from the Signature tour's own gallery.
- Every plan destination page: hero + gallery emitted on the `TouristDestination` node.

---

## Plan

### 1 — Upload the 5 photos + pool them in the database

- Upload each file via Lovable Assets → pointer files under `src/assets/guests/*.jpg.asset.json`. This keeps the repo lightweight and gives every photo a stable CDN URL that's safe to reference from JSON-LD.
- Insert one row per photo into `experience_images` with:
  - `image_url` = CDN URL
  - `alt_text` = subject-accurate caption (e.g. "Guests at Arrábida viewpoint looking over the Sado estuary")
  - `region_key` = Arrábida / Setúbal / Comporta as applicable
  - `mood_tags`, `occasion_tags` = friends, romantic, wine, tasting, group
  - `usage_role` = `hero` or `card` per photo
  - `priority_score` = 80 (real guest photos rank above generic stock)
- This makes them reusable by the Builder, Studio, and any future page that pulls from the pool.

### 2 — Extend JSON-LD helpers (`src/lib/jsonld.ts`)

- Add `imageObjectLd({ url, caption, credit? })` returning a schema.org `ImageObject`.
- Extend `tourProductLd()` args with `gallery?: { src: string; alt: string }[]`. Emit:
  - `image: [heroAbsolute, ...galleryAbsolute]` (crawlers use this)
  - `associatedMedia: [ImageObject...]` for every gallery photo with `caption` and `creditText: "YES Experiences Portugal"`
  - When gallery ≥ 3 photos: a separate `ImageGallery` node with `numberOfItems` + `image[]`, added to the same JSON-LD graph via `@graph`.
- Extend `StopForLd` with optional `image?: string` → emitted as `image` on the stop's `TouristAttraction`.
- Add `touristDestinationLd({ slug, name, description, hero, gallery, includedRegionIds })` for plan destination pages, mirroring the same image structure.

### 3 — Stop → photo matching

- New `src/lib/stopPhotoMatch.ts`: for a given `SignatureTour` and its `stops`, resolve the best photo from `meta.localGallery` (which already carries per-stop alt text) using a fuzzy-match on the stop label vs the photo alt (normalise diacritics, tokenise). Falls back to positional match (stop index ↔ gallery index) when no textual match.
- This is deterministic and uses only existing gallery data — no invented mappings.

### 4 — Wire tour pages (`src/routes/tours.$tourId.tsx`)

- Compute `gallery` via `getTourGallery(tour, meta)` and per-stop `image` via `stopPhotoMatch`.
- Pass both to `tourProductLd`. Head JSON-LD now ships the full gallery + per-stop images.

### 5 — Wire itineraries (`src/components/planning/PlanningItineraryPage.tsx`, `src/routes/itineraries.10-day-private-portugal-tour.tsx`)

- For each day mapped to a Signature tour, resolve its hero + one representative stop photo and inject into the itinerary's `TouristTrip.itinerary` ListItems.

### 6 — Plan destination pages (hero + gallery UI + JSON-LD)

- Extend `PlanningDestination` interface with `hero: { src: string; alt: string }` and `gallery: { src: string; alt: string }[]`.
- Populate all seven plan destinations. Sources, in order of preference:
  1. Uploaded guest photos where the subject matches the region.
  2. Existing real photos already under `src/assets/tours/*` from the corresponding Signature tour.
  3. Never Unsplash / stock.
- Update `PlanningDestinationPage.tsx` to render:
  - A 16:9 hero (single real image, editorial framing).
  - A small 3-up gallery strip beneath the standfirst.
  - JSON-LD via `touristDestinationLd()` emitting the same images.

### 7 — Homepage / corporate / moments image audit

- Read `src/routes/index.tsx`, `corporate.tsx`, `moments.tsx`. Flag any hero/section image that:
  - Repeats across pages (creates the "sticky" feeling)
  - Doesn't visually match its section title (e.g. a coastal shot on a corporate block)
- Swap flagged images for real Signature photos or the uploaded guest photos, using the same asset pointer pattern. Only swap what's genuinely off — no gratuitous churn.

### 8 — Verify

- `bunx tsgo --noEmit` — passes.
- Manually spot-check the JSON-LD emitted for `/tours/arrabida-wine-allinclusive`, `/plan/arrabida`, `/itineraries/10-day-private-portugal-tour` with Google's Rich Results parser format (visual JSON check — no external calls).
- Confirm plan hub pages render the hero without layout shift on mobile 393px.

---

## Files changed

**New**
- `src/lib/stopPhotoMatch.ts`
- `src/assets/guests/arrabida-viewpoint-group.jpg.asset.json`
- `src/assets/guests/vineyard-couple.jpg.asset.json`
- `src/assets/guests/bubbling-wine-tasting.jpg.asset.json`
- `src/assets/guests/chocolate-cake-tasting.jpg.asset.json`
- `src/assets/guests/quinta-group.jpg.asset.json`
- One migration inserting the 5 rows into `experience_images`

**Edited**
- `src/lib/jsonld.ts` — new helpers + gallery/ImageGallery emission
- `src/routes/tours.$tourId.tsx` — pass gallery + per-stop images
- `src/content/planning/destinations.ts` — hero + gallery fields
- `src/components/planning/PlanningDestinationPage.tsx` — render hero/gallery + JSON-LD
- `src/components/planning/PlanningItineraryPage.tsx` — per-stop images in JSON-LD
- `src/routes/itineraries.10-day-private-portugal-tour.tsx` — same
- `src/routes/index.tsx`, `corporate.tsx`, `moments.tsx` — targeted image swaps

## Brand / constraint notes

- No invention: every gallery photo is either a real guest upload or an existing Signature tour photo. No stock, no Unsplash.
- Alt text is written per-photo (subject + location), not templated.
- Schema and on-page images stay in lock-step (Google policy: don't schema an image that isn't visible on the page).
- Mobile-first: hero uses 16:9, gallery is horizontally scrollable at ≤640px.
