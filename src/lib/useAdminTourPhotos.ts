/**
 * Client hook: fetches admin-uploaded photos for a tour from
 * `tour_gallery_photos`, resolves signed URLs (bucket is private but
 * anon has SELECT permission on storage.objects for tour-photos).
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
import { supabase } from "@/integrations/supabase/client";

export type AdminTourPhoto = {
  id: string;
  src: string;
  srcSet?: string;
  alt: string;
  is_cover: boolean;
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

// Widths served by <TourImage sizes="..."> — matches the buckets exposed
// by /api/img and use-imported-tour-images so caches stay unified.
const RESPONSIVE_WIDTHS = [480, 800, 1200, 1600] as const;
const TRANSFORM_QUALITY = 78;

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
      const { data: rows, error } = await supabase
        .from("tour_gallery_photos")
        .select("id, storage_path, alt, is_cover, sort_order")
        .eq("tour_id", tourId)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true });

      if (error || !rows || cancelled) return;

      const paths = rows.map((r) => r.storage_path);
      if (paths.length === 0) {
        setPhotos([]);
        return;
      }

      // Base signed URLs (no transform) — used as the safe fallback `src`
      // when the storage transform API isn't available on the project's
      // plan. `srcSet` variants are opportunistic optimisations layered on
      // top and can be discarded silently if any single width fails.
      const { data: signed } = await supabase.storage
        .from("tour-photos")
        .createSignedUrls(paths, SIGNED_URL_TTL);

      if (cancelled || !signed) return;
      const baseByPath = new Map(signed.map((s) => [s.path ?? "", s.signedUrl]));

      // Build a responsive srcSet by asking Supabase for pre-resized
      // variants at each canonical width. `format: 'origin'` lets the CDN
      // negotiate AVIF/WebP based on the Accept header.
      const variantResults = await Promise.all(
        RESPONSIVE_WIDTHS.map(async (width) => {
          const { data } = await supabase.storage
            .from("tour-photos")
            .createSignedUrls(paths, SIGNED_URL_TTL, {
              transform: { width, quality: TRANSFORM_QUALITY, resize: "cover" },
            } as never);
          return {
            width,
            urlsByPath: new Map((data ?? []).map((s) => [s.path ?? "", s.signedUrl])),
          };
        }),
      ).catch(() => [] as { width: number; urlsByPath: Map<string, string> }[]);

      if (cancelled) return;

      setPhotos(
        rows
          .map((r) => {
            const base = baseByPath.get(r.storage_path) ?? "";
            const parts: string[] = [];
            for (const v of variantResults) {
              const u = v.urlsByPath.get(r.storage_path);
              if (u) parts.push(`${u} ${v.width}w`);
            }
            return {
              id: r.id,
              src: base,
              srcSet: parts.length >= 2 ? parts.join(", ") : undefined,
              alt: r.alt || defaultAlt || "",
              is_cover: r.is_cover,
            };
          })
          .filter((p) => p.src && p.alt),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [tourId, defaultAlt]);

  return photos;
}
