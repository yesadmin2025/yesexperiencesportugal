/**
 * Resolve the gallery photos shown on a Signature tour page.
 *
 * Source priority:
 *  1. `meta.localGallery` — locally-uploaded YES Experiences photos. Used as
 *     soon as it is populated for a tour, with the alt text the editor wrote.
 *  2. `meta.gallery` — external Viator (`media.tacdn.com`) URLs. Fallback
 *     used until the local upload set is in place.
 *
 * Alt text is the editor's responsibility for local photos. For the Viator
 * fallback we synthesise a descriptive alt using the tour title and region
 * so screen readers and crawlers never see an unlabeled image.
 */
import type { SignatureTour } from "@/data/signatureTours";
import type { ViatorMeta } from "@/data/signatureToursViator";

export type TourPhoto = { src: string; alt: string };

/**
 * Returns the photo list to render. First entry is the cover.
 *
 * - When `meta.localGallery` is populated, those photos are returned
 *   verbatim (caller-written alt text).
 * - Otherwise we return the Viator gallery URLs with an alt derived from
 *   `tour.title` + `tour.region`. The first item uses just the title (it's
 *   the hero / cover); subsequent items append a numbered location string.
 */
export function getTourGallery(tour: SignatureTour, meta: ViatorMeta | undefined): TourPhoto[] {
  if (meta?.localGallery?.length) {
    return meta.localGallery.map((p) => ({ src: p.src, alt: p.alt }));
  }
  const fallback = meta?.gallery ?? [];
  return fallback.map((src, i) => ({
    src,
    alt: i === 0 ? `${tour.title} — ${tour.region}` : `${tour.title} — ${tour.region} (${i + 1})`,
  }));
}

/**
 * Convenience: alt text for the single hero image (first cover slot).
 * Uses the local gallery's first alt when available, otherwise a synthesised
 * tour-name + location string.
 */
export function getHeroAlt(tour: SignatureTour, meta: ViatorMeta | undefined): string {
  const first = meta?.localGallery?.[0]?.alt;
  if (first) return first;
  return `${tour.title} — ${tour.region}`;
}
