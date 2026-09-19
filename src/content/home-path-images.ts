import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";
import { useEffect, useMemo, useState } from "react";
import { useEditorialOverrides } from "@/lib/editorial-overrides";
import { supabase } from "@/integrations/supabase/client";
import pierDawn from "@/assets/owner-photos/carrasqueira-pier-dawn-landscape.jpeg.asset.json";
import courtyardSunlight from "@/assets/owner-photos/espichel-courtyard-sunlight.jpeg.asset.json";
import coastPanorama from "@/assets/owner-photos/arrabida-coast-panorama-landscape.jpeg.asset.json";
import coupleEvening from "@/assets/owner-photos/cristo-rei-couple-evening.jpeg.asset.json";
import tableCheers from "@/assets/owner-photos/winery-table-cheers-group.jpeg.asset.json";

/**
 * Homepage-only decision imagery.
 *
 * These are real YES photographs selected for what each path feels like rather
 * than for a destination or a specific tour. Keeping the five assignments in
 * one place makes accidental same-page repetition testable.
 */
export const HOME_PATH_IMAGES = {
  studio: {
    src: pierDawn.url,
    alt: "A wooden pier reaching into still water at first light.",
    width: 1600,
    height: 1027,
    objectPosition: "50% 52%",
  },
  signature: {
    src: courtyardSunlight.url,
    alt: "Sunlight crossing a quiet arcaded courtyard in southern Portugal.",
    width: 1200,
    height: 1600,
    objectPosition: "50% 55%",
  },
  designer: {
    src: coastPanorama.url,
    alt: "A long stretch of coastline opening beneath shifting light.",
    width: 1600,
    height: 747,
    objectPosition: "50% 50%",
  },
  proposals: {
    src: coupleEvening.url,
    alt: "A couple celebrating together at dusk beneath a lit monument.",
    width: 1440,
    height: 1920,
    objectPosition: "50% 40%",
  },
  corporate: {
    src: tableCheers.url,
    alt: "A group raising glasses around a shared table in the open air.",
    width: 1440,
    height: 1920,
    objectPosition: "50% 45%",
  },
} satisfies Record<string, EditorialImageSource>;

export const HOME_PATH_IMAGE_LIST = Object.values(HOME_PATH_IMAGES);

export type HomePathId = keyof typeof HOME_PATH_IMAGES;

/**
 * The five paths are editorial ideas, not geographic products. Location and
 * route data deliberately do not live in this registry.
 */
export const HOME_PATHS = {
  studio: {
    id: "studio",
    label: "Studio",
    image: HOME_PATH_IMAGES.studio,
  },
  signature: {
    id: "signature",
    label: "Signature",
    image: HOME_PATH_IMAGES.signature,
  },
  designer: {
    id: "designer",
    label: "Travel Designer",
    image: HOME_PATH_IMAGES.designer,
  },
  proposals: {
    id: "proposals",
    label: "Moments",
    image: HOME_PATH_IMAGES.proposals,
  },
  corporate: {
    id: "corporate",
    label: "Corporate",
    image: HOME_PATH_IMAGES.corporate,
  },
} as const satisfies Record<
  HomePathId,
  {
    id: HomePathId;
    label: string;
    image: EditorialImageSource;
  }
>;

export const HOME_PATH_LIST = Object.values(HOME_PATHS);

export const HOME_PATH_EDITORIAL_SLOTS = HOME_PATH_LIST.map((path) => ({
  src: path.image.src,
  alt: path.image.alt,
  caption: path.label,
}));

type HomePathContentRow = {
  path_id: HomePathId;
  title: string;
  photo_src: string;
  photo_alt: string;
};

/** One override read powers the five editorial decision cards. */
export function useHomePaths() {
  const photos = useEditorialOverrides("home_paths", HOME_PATH_EDITORIAL_SLOTS);
  const [content, setContent] = useState<HomePathContentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("home_path_content")
        .select("path_id, title, photo_src, photo_alt")
        .eq("is_published", true);
      if (!cancelled && data) setContent(data as HomePathContentRow[]);
    };
    void load();
    const channel = supabase
      .channel(`home-path-content-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "home_path_content" }, () => void load())
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () => HOME_PATH_LIST.map((path, index) => {
      const managed = content.find((row) => row.path_id === path.id);
      const photoSrc = managed?.photo_src ?? photos[index]?.src ?? path.image.src;
      const overridden = photoSrc !== path.image.src;
      return {
        ...path,
        title: managed?.title ?? "",
        image: {
          ...path.image,
          src: photoSrc,
          alt: managed?.photo_alt ?? photos[index]?.alt ?? path.image.alt,
          ...(overridden ? { avifSrcSet: undefined, webpSrcSet: undefined } : {}),
        },
      };
    }),
    [content, photos],
  );
}