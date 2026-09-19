import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";
import { premiumEditorialImage as image } from "@/content/editorial-premium-images";

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
    height: 1066,
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
  corporate: image("azeitao-group-tasting", {
    alt: "Private group sharing a hosted tasting with local producers in Azeitão.",
    width: 1600,
    height: 1066,
    objectPosition: "50% 44%",
  }),
} satisfies Record<string, EditorialImageSource>;

export const HOME_PATH_IMAGE_LIST = Object.values(HOME_PATH_IMAGES);