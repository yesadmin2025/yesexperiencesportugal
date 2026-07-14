/**
 * Match Signature-tour stops to gallery photos.
 *
 * Uses only data we already have: `meta.localGallery` (editor-written alt
 * text) or the Viator gallery order. No invention. Returns undefined when
 * we can't confidently match a photo to a stop.
 */
import type { SignatureTour } from "@/data/signatureTours";
import type { ViatorMeta } from "@/data/signatureToursViator";
import { getTourGallery, type TourPhoto } from "@/lib/tour-gallery";

function tokens(s: string): Set<string> {
  return new Set(
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function score(stopLabel: string, alt: string): number {
  const a = tokens(stopLabel);
  const b = tokens(alt);
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  return hits;
}

/**
 * For each stop (in order), return the best-matching gallery photo. Falls
 * back to positional match (stop i → gallery i) when no token overlap.
 * Returns URLs already normalised to whatever `getTourGallery` returns.
 */
export function matchStopPhotos(
  tour: SignatureTour,
  meta: ViatorMeta | undefined,
): (TourPhoto | undefined)[] {
  const gallery = getTourGallery(tour, meta);
  const stops = tour.stops ?? [];
  if (gallery.length === 0) return stops.map(() => undefined);
  return stops.map((stop, idx) => {
    let best: TourPhoto | undefined;
    let bestScore = 0;
    for (const g of gallery) {
      const s = score(stop.label, g.alt);
      if (s > bestScore) {
        bestScore = s;
        best = g;
      }
    }
    if (best) return best;
    // Positional fallback (skip index 0 which is the shared hero).
    return gallery[Math.min(idx + 1, gallery.length - 1)];
  });
}
