import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";
import { useEffect, useMemo, useState } from "react";
import { premiumEditorialImage as image } from "@/content/editorial-premium-images";
import { useEditorialOverrides } from "@/lib/editorial-overrides";
import { supabase } from "@/integrations/supabase/client";
import ceramicPainter from "@/assets/owner-photos/ceramic-painter-plate.jpeg.asset.json";

/**
 * Homepage-only decision imagery.
 *
 * These are real YES photographs selected for what each path feels like rather
 * than for a destination or a specific tour. Keeping the five assignments in
 * one place makes accidental same-page repetition testable.
 */
export const HOME_PATH_IMAGES = {
  studio: {
    src: ceramicPainter.url,
    alt: "An artisan painting a botanical motif by hand on a ceramic plate.",
    width: 975,
    height: 1026,
    objectPosition: "50% 48%",
  },
  signature: image("tasting-flight-full", {
    alt: "A carefully prepared flight of Portuguese wines ready to taste.",
    width: 1920,
    height: 1440,
    objectPosition: "50% 52%",
  }),
  designer: image("moscatel-giant-vats-guide", {
    alt: "A local host guiding a small private group through a historic wine cellar.",
    width: 1920,
    height: 1280,
    objectPosition: "50% 48%",
  }),
  proposals: image("troia-couple-coast", {
    alt: "A couple sharing an unhurried conversation beside the Atlantic.",
    width: 1600,
    height: 1058,
    objectPosition: "50% 42%",
  }),
  corporate: image("winery-group-orange-tree", {
    alt: "A private group gathered together in a garden after a shared day.",
    width: 1600,
    height: 1200,
    objectPosition: "50% 48%",
  }),
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