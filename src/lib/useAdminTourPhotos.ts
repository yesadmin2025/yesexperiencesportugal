/**
 * Client hook: fetches admin-uploaded photos for a tour from
 * `tour_gallery_photos`, resolves signed URLs (bucket is private but
 * anon has SELECT permission on storage.objects for tour-photos).
 *
 * Returns photos sorted by is_cover DESC, then sort_order ASC.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminTourPhoto = { id: string; src: string; alt: string; is_cover: boolean };

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

export function useAdminTourPhotos(tourId: string | undefined): AdminTourPhoto[] {
  const [photos, setPhotos] = useState<AdminTourPhoto[]>([]);

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
      const { data: signed } = await supabase.storage
        .from("tour-photos")
        .createSignedUrls(paths, SIGNED_URL_TTL);

      if (cancelled || !signed) return;
      const byPath = new Map(signed.map((s) => [s.path ?? "", s.signedUrl]));
      setPhotos(
        rows
          .map((r) => ({
            id: r.id,
            src: byPath.get(r.storage_path) ?? "",
            alt: r.alt || "",
            is_cover: r.is_cover,
          }))
          .filter((p) => p.src),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [tourId]);

  return photos;
}
