import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

import coupleEvening from "@/assets/owner-photos/cristo-rei-couple-evening.jpeg.asset.json";
import couplePetiscos from "@/assets/owner-photos/couple-petiscos-patio.jpeg.asset.json";
import arrabidaWomen from "@/assets/owner-photos/arrabida-viewpoint-women.jpeg.asset.json";
import wineryGroup from "@/assets/owner-photos/winery-group-orange-tree.jpeg.asset.json";
import barrelCellar from "@/assets/owner-photos/barrel-cellar-tasting.jpeg.asset.json";
import moscatelGuide from "@/assets/owner-photos/moscatel-giant-vats-guide.jpeg.asset.json";

export const CORPORATE_SERVICE_IMAGES: EditorialImageSource[] = [
  {
    src: wineryGroup.url,
    alt: "Private group welcomed together at a winery in the Setúbal Peninsula.",
    width: 1600,
    height: 1200,
    objectPosition: "50% 48%",
  },
  {
    src: barrelCellar.url,
    alt: "Colleagues gathered around a guided tasting inside a Portuguese barrel cellar.",
    width: 1920,
    height: 885,
    objectPosition: "50% 50%",
  },
  {
    src: moscatelGuide.url,
    alt: "A local guide hosting a small private group beside historic Moscatel vats.",
    width: 1440,
    height: 1920,
    objectPosition: "50% 50%",
  },
];

export const PROPOSAL_SERVICE_IMAGES: EditorialImageSource[] = [
  {
    src: coupleEvening.url,
    alt: "A couple sharing a private evening beneath the illuminated Cristo Rei monument.",
    width: 1440,
    height: 1920,
    objectPosition: "50% 70%",
  },
  {
    src: couplePetiscos.url,
    alt: "A couple sharing wine and petiscos on a relaxed Portuguese terrace.",
    width: 1920,
    height: 885,
    objectPosition: "52% 52%",
  },
  {
    src: arrabidaWomen.url,
    alt: "Two friends pausing together above the Arrábida coast during a private day.",
    width: 1440,
    height: 1920,
    objectPosition: "50% 48%",
  },
];
