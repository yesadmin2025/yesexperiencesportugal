import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

import wineryGroup from "@/assets/owner-photos/winery-group-orange-tree.jpeg.asset.json";
import barrelCellar from "@/assets/owner-photos/barrel-cellar-tasting.jpeg.asset.json";
import moscatelGuide from "@/assets/owner-photos/moscatel-giant-vats-guide.jpeg.asset.json";
import coupleVineyard from "@/assets/owner-photos/couple-vineyard.jpeg.asset.json";
import wineCheers from "@/assets/owner-photos/wine-cheers-arch.jpeg.asset.json";
import tastingCake from "@/assets/owner-photos/tasting-cake-moment.jpeg.asset.json";

const srcSet = (small: string, large: string) => `${small} 640w, ${large} 1280w`;

export const CORPORATE_SERVICE_IMAGES: EditorialImageSource[] = [
  {
    src: wineryGroup.url,
    alt: "Private group sharing a hosted winery experience beneath an orange tree in Portugal.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/d55c547a-abcd-49fb-89f1-a5f598f2bd02/winery-group-orange-tree-640.avif",
      "/__l5e/assets-v1/e0d80f3b-9976-4e3a-8999-39eb476da4c5/winery-group-orange-tree-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/f5db4a6c-af70-4f9a-ac5d-66743e3c7b18/winery-group-orange-tree-640.webp",
      "/__l5e/assets-v1/a570974e-cb2e-4112-b213-1fa995383efb/winery-group-orange-tree-1280.webp",
    ),
    width: 1280,
    height: 960,
    objectPosition: "50% 48%",
  },
  {
    src: barrelCellar.url,
    alt: "Colleagues gathered around a guided wine tasting inside a Portuguese barrel cellar.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/b2df82d2-7005-431f-916c-f094b697d195/barrel-cellar-tasting-640.avif",
      "/__l5e/assets-v1/c6497ee3-9086-46cd-b00d-bd6c252a431b/barrel-cellar-tasting-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/af7efc7c-a6bc-49a7-b494-64a5efe57dea/barrel-cellar-tasting-640.webp",
      "/__l5e/assets-v1/b4f5e62a-3db2-48f3-90fc-1fb6feb5abd5/barrel-cellar-tasting-1280.webp",
    ),
    width: 1280,
    height: 590,
    objectPosition: "50% 50%",
  },
  {
    src: moscatelGuide.url,
    alt: "Local wine guide hosting guests beside historic Moscatel vats in Setúbal.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/fb41ed29-c6ea-4082-b88c-933490a3689d/moscatel-giant-vats-guide-640.avif",
      "/__l5e/assets-v1/43844be5-bce8-4f0a-b25c-826307c3e3cf/moscatel-giant-vats-guide-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/a441d7d0-f908-465b-a2a9-353a70bd24aa/moscatel-giant-vats-guide-640.webp",
      "/__l5e/assets-v1/16608c46-7241-4477-941f-3a7bb8f12724/moscatel-giant-vats-guide-1280.webp",
    ),
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
  },
];

export const PROPOSAL_SERVICE_IMAGES: EditorialImageSource[] = [
  {
    src: coupleVineyard.url,
    alt: "Couple walking together between vineyard rows during a private day in Portugal.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/47f95f3c-c492-4a1e-88b5-2695840528df/couple-vineyard-640.avif",
      "/__l5e/assets-v1/93ff80ec-bc6a-4479-967c-c5772024d8a1/couple-vineyard-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/d0f8e208-6514-485d-aa8c-1bfd8fd4ef28/couple-vineyard-640.webp",
      "/__l5e/assets-v1/4132916a-4fa1-4fc2-9df3-a3181ccb6bce/couple-vineyard-1280.webp",
    ),
    width: 1280,
    height: 1707,
    objectPosition: "50% 46%",
  },
  {
    src: wineCheers.url,
    alt: "Guests raising Portuguese wine glasses together beneath a stone arch.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/d978c41f-1380-4095-bbfe-22c921a812df/wine-cheers-arch-640.avif",
      "/__l5e/assets-v1/351aba68-a8e1-4874-bbfb-8c882ad70361/wine-cheers-arch-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/1663c8b0-1f5d-41aa-86e0-75aa3fc5258e/wine-cheers-arch-640.webp",
      "/__l5e/assets-v1/e77cfb1a-d2ca-4675-a822-6e56cb403e42/wine-cheers-arch-1280.webp",
    ),
    width: 1280,
    height: 1600,
    objectPosition: "50% 50%",
  },
  {
    src: tastingCake.url,
    alt: "Friends sharing a cake and wine tasting moment around a table in Portugal.",
    avifSrcSet: srcSet(
      "/__l5e/assets-v1/e7a38cbb-1263-4cb3-97e6-294fe0d6feb0/tasting-cake-moment-640.avif",
      "/__l5e/assets-v1/779a5f57-82f1-4437-a019-524797f5504d/tasting-cake-moment-1280.avif",
    ),
    webpSrcSet: srcSet(
      "/__l5e/assets-v1/dc82d2c7-78fe-4b09-907c-57dd66d40213/tasting-cake-moment-640.webp",
      "/__l5e/assets-v1/13dc5846-af01-4925-88f2-de8c8728262a/tasting-cake-moment-1280.webp",
    ),
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
  },
];