/**
 * Public read path for admin-uploaded tour gallery photos.
 *
 * The `tour-photos` bucket is private and `storage.objects` no longer grants
 * anonymous SELECT. Signing happens here, server-side, and only for paths that
 * are actually referenced by a `tour_gallery_photos` row for the requested
 * tour — visitors can never reach arbitrary objects in the bucket.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days
const RESPONSIVE_WIDTHS = [480, 800, 1200, 1600] as const;
const TRANSFORM_QUALITY = 78;

export interface SignedTourPhoto {
  id: string;
  src: string;
  srcSet?: string;
  alt: string;
  is_cover: boolean;
}

const schema = z.object({
  tourId: z.string().min(1).max(120),
});

export const getSignedTourPhotos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<{ photos: SignedTourPhoto[] }> => {
    const { data: rows, error } = await supabaseAdmin
      .from("tour_gallery_photos")
      .select("id, storage_path, alt, is_cover, sort_order")
      .eq("tour_id", data.tourId)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error || !rows || rows.length === 0) return { photos: [] };

    const paths = rows.map((r) => r.storage_path);

    const { data: signed } = await supabaseAdmin.storage
      .from("tour-photos")
      .createSignedUrls(paths, SIGNED_URL_TTL);
    const baseByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));

    const variantResults = await Promise.all(
      RESPONSIVE_WIDTHS.map(async (width) => {
        const { data: v } = await supabaseAdmin.storage
          .from("tour-photos")
          .createSignedUrls(paths, SIGNED_URL_TTL, {
            transform: { width, quality: TRANSFORM_QUALITY, resize: "cover" },
          } as never);
        return {
          width,
          urlsByPath: new Map((v ?? []).map((s) => [s.path ?? "", s.signedUrl])),
        };
      }),
    ).catch(() => [] as { width: number; urlsByPath: Map<string, string> }[]);

    const photos = rows
      .map((r) => {
        const parts: string[] = [];
        for (const v of variantResults) {
          const u = v.urlsByPath.get(r.storage_path);
          if (u) parts.push(`${u} ${v.width}w`);
        }
        return {
          id: r.id,
          src: baseByPath.get(r.storage_path) ?? "",
          srcSet: parts.length >= 2 ? parts.join(", ") : undefined,
          alt: r.alt ?? "",
          is_cover: r.is_cover,
        };
      })
      .filter((p) => p.src);

    return { photos };
  });
