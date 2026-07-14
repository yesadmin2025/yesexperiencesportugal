import type { PlanningItinerary } from "@/content/planning/itineraries";
import type { PlanningDestination } from "@/content/planning/destinations";
import { jsonLdScript, breadcrumbLd, faqPageLd, SITE_URL } from "@/lib/jsonld";
import { findTour } from "@/data/signatureTours";

/** Builds the head() config for an itinerary page. */
export function itineraryHead(itinerary: PlanningItinerary) {
  const url = `${SITE_URL}${itinerary.path}`;
  const tripLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: itinerary.h1,
    description: itinerary.metaDescription,
    url,
    mainEntityOfPage: url,
    duration: itinerary.isoDuration,
    provider: { "@id": `${SITE_URL}/#organization` },
    touristType: "Private travellers · couples · small families",
    itinerary: {
      "@type": "ItemList",
      numberOfItems: itinerary.days.length,
      itemListElement: itinerary.days.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TouristDestination",
          name: `${d.span} — ${d.eyebrow}`,
          description: d.body,
        },
      })),
    },
  };

  return {
    meta: [
      { title: itinerary.metaTitle },
      { name: "description", content: itinerary.metaDescription },
      { property: "og:title", content: itinerary.metaTitle },
      { property: "og:description", content: itinerary.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLdScript(tripLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: "/plan" },
          { name: itinerary.h1, path: itinerary.path },
        ]),
      ),
      ...(itinerary.faq.length > 0 ? [jsonLdScript(faqPageLd(itinerary.faq))] : []),
    ],
  };
}

/** Builds the head() config for a destination page. */
export function destinationHead(destination: PlanningDestination) {
  const url = `${SITE_URL}${destination.path}`;
  // Pull an og:image from the first featured Signature tour so shares
  // carry a real photo rather than a placeholder.
  const firstTour = destination.signatureIds.map((id) => findTour(id)).find(Boolean);
  const image = firstTour?.img
    ? firstTour.img.startsWith("http")
      ? firstTour.img
      : `${SITE_URL}${firstTour.img.startsWith("/") ? "" : "/"}${firstTour.img}`
    : undefined;

  const destinationLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${url}#destination`,
    name: destination.h1.replace(/^Planning a Private Trip to /, ""),
    description: destination.metaDescription,
    url,
    ...(image ? { image } : {}),
    includesAttraction: destination.signatureIds
      .map((id) => findTour(id))
      .filter((t): t is NonNullable<ReturnType<typeof findTour>> => Boolean(t))
      .map((t) => ({
        "@type": "TouristAttraction",
        name: t.title,
        url: `${SITE_URL}/tours/${t.id}`,
      })),
  };

  return {
    meta: [
      { title: destination.metaTitle },
      { name: "description", content: destination.metaDescription },
      { property: "og:title", content: destination.metaTitle },
      { property: "og:description", content: destination.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      ...(image ? [{ property: "og:image", content: image }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLdScript(destinationLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: "/plan" },
          { name: destination.h1.replace(/^Planning a Private Trip to /, ""), path: destination.path },
        ]),
      ),
      ...(destination.faq.length > 0 ? [jsonLdScript(faqPageLd(destination.faq))] : []),
    ],
  };
}
