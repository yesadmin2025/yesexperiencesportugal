# Tour photos — YES Experiences uploads

This folder hosts locally-uploaded YES Experiences gallery photos used on
`/tours/<tourId>` pages. When you populate a tour's `localGallery` in
`src/data/signatureToursViator.ts`, the page swaps the external
`media.tacdn.com` (Viator) gallery for these files automatically.

## Where to put files

Suggested layout: one folder per tour id, files served from `/tours/<id>/…`.

```
public/tours/
  arrabida-wine-allinclusive/
    01-cover.webp
    02-tasting.webp
    03-vineyard.webp
  wild-beaches-picnic/
    01-cover.webp
    ...
```

Tour ids live in `src/data/signatureTours.ts` (the `id:` field of each
entry, e.g. `arrabida-wine-allinclusive`, `wild-beaches-picnic`,
`sintra-cascais`, `troia-comporta`, `evora-alentejo`, `tiles-workshop`,
`azeitao-cheese`, `arrabida-boat`, `tomar-coimbra`,
`fatima-nazare-obidos`, `roman-heritage-alentejo`).

## File format

Use modern formats — **WebP** or **AVIF** — at 1600px wide max for the
hero/cover slot and ~1200px for the rest. Keep JPEG only for fallback.
The page tags every image with `loading="lazy"` and `decoding="async"`
below the fold; the cover is loaded eagerly.

## Wiring a tour to its uploads

Edit `src/data/signatureToursViator.ts` and add a `localGallery` array
under the tour's `VIATOR_META` entry. Every entry needs a descriptive
`alt` that names the **tour** and a **real location**:

```ts
"arrabida-wine-allinclusive": {
  /* …existing fields… */
  localGallery: [
    {
      src: "/tours/arrabida-wine-allinclusive/01-cover.webp",
      alt: "Private wine tasting at a family winery in Arrábida — Arrábida Private Wine Tour",
    },
    {
      src: "/tours/arrabida-wine-allinclusive/02-vineyard.webp",
      alt: "Vineyard view over the Setúbal hills — Arrábida Private Wine Tour",
    },
    /* …add as many as you like… */
  ],
},
```

Once `localGallery` is non-empty for a tour, that tour stops loading
`media.tacdn.com` images entirely.
