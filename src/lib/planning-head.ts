import type { PlanningItinerary } from "@/content/planning/itineraries";
import type { PlanningDestination } from "@/content/planning/destinations";
import {
  jsonLdScript,
  breadcrumbLd,
  faqPageLd,
  imageGalleryLd,
  pageGalleryLd,
  stopMediaLd,
  touristDestinationLd,
  absUrl,
  SITE_URL,
} from "@/lib/jsonld";
import { findTour } from "@/data/signatureTours";

/** Builds the head() config for an itinerary page. */
export function itineraryHead(itinerary: PlanningItinerary) {
  const url = `${SITE_URL}${itinerary.path}`;

  // For each day, pull the hero image from the first mapped Signature tour
  // so crawlers get a per-stop visual anchor alongside the description.
  const dayItems = itinerary.days.map((d, i) => {
    const firstTour = (d.signatureIds ?? []).map((id) => findTour(id)).find(Boolean);
    const image = firstTour?.img ? absUrl(firstTour.img) : undefined;
    return {
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristDestination",
        name: `${d.span} — ${d.eyebrow}`,
        description: d.body,
        ...(image ? { image } : {}),
      },
    };
  });

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
      itemListElement: dayItems,
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
  const shortName = destination.h1.replace(/^Planning a Private Trip to /, "");
  const heroAbs = absUrl(destination.hero.src);

  const attractions = destination.signatureIds
    .map((id) => findTour(id))
    .filter((t): t is NonNullable<ReturnType<typeof findTour>> => Boolean(t))
    .map((t) => ({
      name: t.title,
      url: `${SITE_URL}/tours/${t.id}`,
      image: t.img,
    }));

  const destinationLd = touristDestinationLd({
    path: destination.path,
    name: shortName,
    description: destination.metaDescription,
    hero: destination.hero,
    gallery: destination.gallery,
    includedAttractions: attractions,
  });

  const galleryLd =
    destination.gallery.length >= 2
      ? imageGalleryLd({
          pageUrl: url,
          name: `${shortName} — real photos from our private days`,
          photos: [destination.hero, ...destination.gallery],
        })
      : null;

  return {
    meta: [
      { title: destination.metaTitle },
      { name: "description", content: destination.metaDescription },
      { property: "og:title", content: destination.metaTitle },
      { property: "og:description", content: destination.metaDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:image", content: heroAbs },
      { property: "twitter:image", content: heroAbs },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLdScript(destinationLd),
      ...(galleryLd ? [jsonLdScript(galleryLd)] : []),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: "/plan" },
          { name: shortName, path: destination.path },
        ]),
      ),
      ...(destination.faq.length > 0 ? [jsonLdScript(faqPageLd(destination.faq))] : []),
    ],
  };
}
