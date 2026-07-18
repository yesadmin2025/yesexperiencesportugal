import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

import { premiumEditorialImage as image } from "@/content/editorial-premium-images";

export const CORPORATE_SERVICE_IMAGES: EditorialImageSource[] = [
  image("azeitao-group-tasting", { alt: "Private group sharing a hosted tasting with local producers in Azeitão.", width: 1600, height: 1066, objectPosition: "50% 44%", alternate: image("tasting-flight-full", { alt: "A complete hosted Portuguese wine flight prepared for private guests.", width: 1920, height: 1440, objectPosition: "50% 50%" }) }),
  image("arrabida-team-viewpoint", { alt: "Private group pausing together above the Arrábida coast during a hosted day.", width: 1600, height: 1065, objectPosition: "50% 42%", alternate: image("moscatel-giant-vats-guide", { alt: "Local wine guide hosting guests beside historic Moscatel vats in Setúbal.", width: 1920, height: 1440, objectPosition: "50% 48%" }) }),
  image("alentejo-group-ruins", { alt: "Private guests sharing a hosted cultural moment among Roman ruins in Alentejo.", width: 1600, height: 1058, objectPosition: "50% 46%", alternate: image("arrabida-viewpoint-group", { alt: "Private group with their local host at the Serra da Arrábida viewpoint.", width: 1824, height: 1368, objectPosition: "50% 45%" }) }),
];

export const PROPOSAL_SERVICE_IMAGES: EditorialImageSource[] = [
  image("troia-couple-coast", { alt: "Couple walking together above the Atlantic during a private day in Portugal.", width: 1600, height: 1058, objectPosition: "50% 42%", alternate: image("couple-petiscos-patio", { alt: "Couple sharing wine and petiscos on a quiet Portuguese terrace.", width: 1920, height: 885, objectPosition: "50% 52%" }) }),
  image("wine-cheers-arch", { alt: "Guests raising Portuguese wine glasses together beneath a stone arch.", width: 1440, height: 1800, objectPosition: "50% 48%", alternate: image("tasting-cake-moment", { alt: "Friends sharing cake and a wine tasting around a table in Portugal.", width: 1920, height: 1440, objectPosition: "50% 48%" }) }),
  image("azulejo-private-workshop", { alt: "Private guests painting traditional azulejos together in a Portuguese workshop.", width: 1600, height: 1066, objectPosition: "50% 46%", alternate: image("couple-vineyard", { alt: "Couple embracing between vineyard rows during a private day in Portugal.", width: 1368, height: 1824, objectPosition: "50% 44%" }) }),
];