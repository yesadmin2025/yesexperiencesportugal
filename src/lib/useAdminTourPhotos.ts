/**
 * Client hook: fetches admin-uploaded photos for a tour.
 *
 * Signing happens server-side (`getSignedTourPhotos`): the `tour-photos`
 * bucket is private and anonymous visitors have no read access to
 * `storage.objects`, so only paths referenced by a `tour_gallery_photos` row
 * are ever signed.
 *
 * Perf: each photo returns a responsive `srcSet` string built from
 * Supabase Storage's built-in image transformation API — real AVIF/WebP
 * negotiation + width resizing happens at the storage edge, so mobile
 * devices never download desktop-sized originals.
 *
 * A11y: `alt` falls back to a synthesised "<tour name> — <region>" string
 * when the editor leaves it blank, so no admin photo ever renders unlabelled.
 *
 * Returns photos sorted by is_cover DESC, then sort_order ASC.
 */
import { useEffect, useState } from "react";
import { getSignedTourPhotos } from "@/lib/tourPhotos.functions";

export type AdminTourPhoto = {
  id: string;
  src: string;
  srcSet?: string;
  alt: string;
  is_cover: boolean;
  /** Itinerary stop this photo belongs to, when the editor assigned one. */
  stopLabel: string | null;
};


type Options = {
  /** Fallback alt (usually "<tour title> — <region>") used when the editor
   *  left the alt column blank. Screen readers must never see an empty alt
   *  on informative photos. */
  defaultAlt?: string;
};

export function useAdminTourPhotos(
  tourId: string | undefined,
  options: Options = {},
): AdminTourPhoto[] {
  const [photos, setPhotos] = useState<AdminTourPhoto[]>([]);
  const defaultAlt = options.defaultAlt;

  useEffect(() => {
    if (!tourId) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getSignedTourPhotos({ data: { tourId } });
        if (cancelled) return;
        setPhotos(
          result.photos
            .map((p) => ({
              id: p.id,
              src: p.src,
              srcSet: p.srcSet,
              alt: p.alt || defaultAlt || "",
              is_cover: p.is_cover,
              stopLabel: p.stop_label ?? null,
            }))
            .filter((p) => p.src && p.alt),
        );

      } catch {
        if (!cancelled) setPhotos([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tourId, defaultAlt]);

  return photos;
}
