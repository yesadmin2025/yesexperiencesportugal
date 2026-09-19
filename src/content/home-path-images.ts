import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";
import { useEffect, useMemo, useState } from "react";
import { premiumEditorialImage as image } from "@/content/editorial-premium-images";
import { useEditorialOverrides } from "@/lib/editorial-overrides";
import { supabase } from "@/integrations/supabase/client";

/**
 * Homepage-only decision imagery.
 *
 * These are real YES operation photographs selected away from Signature cover
 * frames and the later homepage Journal cards. Keeping the five assignments in
 * one place makes accidental same-page repetition testable.
 */
export const HOME_PATH_IMAGES = {
  studio: image("azulejo-private-workshop", {
    alt: "Private guests painting traditional azulejos together in Azeitão.",
    width: 1600,
    height: 1058,
    objectPosition: "50% 46%",
  }),
  signature: image("arrabida-team-viewpoint", {
    alt: "Private guests pausing with their local host above the Arrábida coast.",
    width: 1600,
    height: 1065,
    objectPosition: "50% 42%",
  }),
  designer: image("alentejo-group-ruins", {
    alt: "Private guests sharing a hosted cultural moment among Roman ruins in Alentejo.",
    width: 1600,
    height: 1058,
    objectPosition: "50% 46%",
  }),
  proposals: image("troia-couple-coast", {
    alt: "Couple walking together above the Atlantic during a private day in Portugal.",
    width: 1600,
    height: 1058,
    objectPosition: "50% 42%",
  }),
  corporate: image("winery-group-orange-tree", {
    alt: "Private group welcomed at a Setúbal Peninsula winery during a hosted day.",
    width: 1600,
    height: 1200,
    objectPosition: "50% 48%",
  }),
} satisfies Record<string, EditorialImageSource>;

export const HOME_PATH_IMAGE_LIST = Object.values(HOME_PATH_IMAGES);

export type HomePathId = keyof typeof HOME_PATH_IMAGES;

/**
 * One factual visual identity shared by the Five Ways cards and the homepage
 * map. The map consumes this registry directly so the card and destination can
 * never drift onto different photographs.
 */
export const HOME_PATH_DESTINATIONS = {
  studio: {
    id: "studio",
    label: "Studio",
    destination: "Azeitão",
    routeLabel: "Lisbon → Azeitão",
    mapRegionId: "azeitao",
    image: HOME_PATH_IMAGES.studio,
  },
  signature: {
    id: "signature",
    label: "Signature",
    destination: "Arrábida",
    routeLabel: "Lisbon → Arrábida",
    mapRegionId: "arrabida",
    image: HOME_PATH_IMAGES.signature,
  },
  designer: {
    id: "designer",
    label: "Travel Designer",
    destination: "Alentejo",
    routeLabel: "A journey through Alentejo",
    mapRegionId: "evora",
    image: HOME_PATH_IMAGES.designer,
  },
  proposals: {
    id: "proposals",
    label: "Moments",
    destination: "Tróia",
    routeLabel: "Lisbon → Tróia",
    mapRegionId: "troia",
    image: HOME_PATH_IMAGES.proposals,
  },
  corporate: {
    id: "corporate",
    label: "Corporate",
    destination: "Azeitão",
    routeLabel: "Lisbon → Azeitão",
    mapRegionId: "azeitao",
    image: HOME_PATH_IMAGES.corporate,
  },
} as const satisfies Record<
  HomePathId,
  {
    id: HomePathId;
    label: string;
    destination: string;
    routeLabel: string;
    mapRegionId: string;
    image: EditorialImageSource;
  }
>;

export const HOME_PATH_DESTINATION_LIST = Object.values(HOME_PATH_DESTINATIONS);

export const HOME_PATH_EDITORIAL_SLOTS = HOME_PATH_DESTINATION_LIST.map((path) => ({
  src: path.image.src,
  alt: path.image.alt,
  caption: path.routeLabel,
}));

type HomePathContentRow = {
  path_id: HomePathId;
  title: string;
  route_label: string;
  destination: string;
  photo_src: string;
  photo_alt: string;
};

/** One override read powers both the Five Ways cards and the matching map panel. */
export function useHomePathDestinations() {
  const photos = useEditorialOverrides("home_paths", HOME_PATH_EDITORIAL_SLOTS);
  const [content, setContent] = useState<HomePathContentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("home_path_content")
        .select("path_id, title, route_label, destination, photo_src, photo_alt")
        .eq("is_published", true);
      if (!cancelled && data) setContent(data as HomePathContentRow[]);
    };
    void load();
    const channel = supabase
      .channel("home-path-content-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_path_content" }, () => void load())
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () => HOME_PATH_DESTINATION_LIST.map((path, index) => {
      const managed = content.find((row) => row.path_id === path.id);
      const photoSrc = managed?.photo_src ?? photos[index]?.src ?? path.image.src;
      const overridden = photoSrc !== path.image.src;
      return {
        ...path,
        title: managed?.title ?? "",
        destination: managed?.destination ?? path.destination,
        routeLabel: managed?.route_label ?? path.routeLabel,
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