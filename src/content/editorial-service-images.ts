import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

import { premiumEditorialImage as image } from "@/content/editorial-premium-images";

export const CORPORATE_SERVICE_IMAGES: EditorialImageSource[] = [
  image("azeitao-group-tasting", {
    alt: "Private group sharing a hosted tasting with local producers in Azeitão.",
    width: 1600,
    height: 1066,
    objectPosition: "50% 44%",
  }),
  image("arrabida-viewpoint-group", {
    alt: "Private group pausing together above the Arrábida coast during a hosted day.",
    width: 1824,
    height: 1368,
    objectPosition: "50% 42%",
  }),
  image("sintra-group-selfie", {
    alt: "Private group arriving in Sintra with their local host.",
    width: 1280,
    height: 1707,
    objectPosition: "50% 42%",
  }),
];

export const PROPOSAL_SERVICE_IMAGES: EditorialImageSource[] = [
  image("couple-petiscos-patio", {
    alt: "Couple sharing wine and petiscos on a quiet Portuguese terrace.",
    width: 1920,
    height: 885,
    objectPosition: "50% 52%",
  }),
  image("wine-cheers-arch", {
    alt: "Guests raising Portuguese wine glasses together beneath a stone arch.",
    width: 1440,
    height: 1800,
    objectPosition: "50% 48%",
  }),
  image("couple-vineyard", {
    alt: "Couple embracing between vineyard rows during a private day in Portugal.",
    width: 1368,
    height: 1824,
    objectPosition: "50% 44%",
  }),
];
