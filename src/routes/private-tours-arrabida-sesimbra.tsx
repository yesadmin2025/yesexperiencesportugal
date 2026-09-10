import { createFileRoute } from "@tanstack/react-router";

import { RegionListingPage, regionTours } from "@/components/seo/RegionListingPage";
import { findLisbonRegion } from "@/content/lisbon-regions";
import {
  breadcrumbLd,
  faqPageLd,
  itemListLd,
  jsonLdScript,
  localBusinessLd,
} from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";

const REGION = findLisbonRegion("/private-tours-arrabida-sesimbra");
const PAGE_URL = `${WEBSITE_URL}${REGION.path}`;

export const Route = createFileRoute("/private-tours-arrabida-sesimbra")({
  head: () => ({
    meta: [
      { title: REGION.title },
      { name: "description", content: REGION.description },
      { property: "og:title", content: REGION.title },
      { property: "og:description", content: REGION.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Day trips from Lisbon", path: "/day-trips-from-lisbon" },
          { name: REGION.name, path: REGION.path },
        ]),
      ),
      jsonLdScript(
        localBusinessLd({
          path: REGION.path,
          name: `YES Experiences Portugal — ${REGION.name}`,
          description: REGION.description,
          areaServed: REGION.areaServed,
        }),
      ),
      jsonLdScript(
        itemListLd({
          name: `Private tours in ${REGION.name}`,
          path: REGION.path,
          items: regionTours(REGION).map((t) => ({
            id: t.id,
            name: t.title,
            description: t.blurb,
          })),
        }),
      ),
      jsonLdScript(faqPageLd([...REGION.faq])),
    ],
  }),
  component: () => <RegionListingPage region={REGION} />,
});
