import { createFileRoute } from "@tanstack/react-router";

import { AreaLandingPage, areaFaq, areaTours } from "@/components/seo/AreaLandingPage";
import { findServiceAreaPage } from "@/content/service-area-pages";
import {
  breadcrumbLd,
  faqPageLd,
  itemListLd,
  jsonLdScript,
  localBusinessLd,
} from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";

/**
 * /private-tours-lisbon — the Lisbon service-area page (ninth area).
 *
 * Deliberately scoped to the *area* intent the other eight area pages use:
 * where we collect guests in the city, drive times in each direction, and the
 * real Signature days that leave from Lisbon. The broader "Lisbon tours & day
 * trips" hub intent stays with /lisbon-private-tours, which this page links to,
 * so the two never compete for the same result.
 */
const AREA = findServiceAreaPage("/private-tours-lisbon");
const PAGE_URL = `${WEBSITE_URL}${AREA.path}`;

export const Route = createFileRoute("/private-tours-lisbon")({
  head: () => ({
    meta: [
      { title: AREA.title },
      { name: "description", content: AREA.description },
      { property: "og:title", content: AREA.title },
      { property: "og:description", content: AREA.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Private Lisbon tours", path: "/lisbon-private-tours" },
          { name: AREA.area, path: AREA.path },
        ]),
      ),
      jsonLdScript(
        localBusinessLd({
          path: AREA.path,
          name: `YES Experiences Portugal — ${AREA.area}`,
          description: AREA.description,
          areaServed: AREA.areaServed,
          pickup: AREA.pickup,
        }),
      ),
      jsonLdScript(
        itemListLd({
          name: `Private tours from ${AREA.area}`,
          path: AREA.path,
          items: areaTours(AREA).map((t) => ({
            id: t.id,
            name: t.title,
            description: t.blurb,
          })),
        }),
      ),
      jsonLdScript(faqPageLd(areaFaq(AREA))),
    ],
  }),
  component: () => <AreaLandingPage page={AREA} />,
});
