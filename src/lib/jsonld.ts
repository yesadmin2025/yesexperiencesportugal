/**
 * JSON-LD helpers for Google rich-result eligibility.
 *
 * - Organization + WebSite ship sitewide from __root.tsx.
 * - BreadcrumbList ships per leaf route (Home › Section › …).
 * - tourProduct() builds a Product node for /tours/$tourId.
 *
 * All builders return a plain object; the caller stringifies once
 * inside head().scripts so TanStack Router emits a single
 * `<script type="application/ld+json">` per node.
 */

export const SITE_URL = "https://yesexperiencesportugal.com";

/**
 * Sitewide Organization — emitted on every page from __root.tsx.
 *
 * Combines TravelAgency + LocalBusiness so Google can surface it both
 * as the brand entity (knowledge panel, sitelinks) AND as a local
 * place (Maps, "near me", local pack). RNAVT licence is declared via
 * `identifier` so structured-data tests don't flag a free-text claim.
 */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "YES Experiences Portugal",
    alternateName: ["YES experiences Portugal", "Yes Experiences"],
    legalName: "YES Experiences Portugal",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/svg/yes-experiences-portugal-horizontal-full.svg`,
    image: `${SITE_URL}/brand/svg/yes-experiences-portugal-horizontal-full.svg`,
    description:
      "Licensed Portuguese tour operator (RNAVT) crafting private, meaningful experiences — Signature days, an Experience Studio that designs and reserves in minutes, bespoke multi-day journeys, and private occasions in Lisbon, Sintra, Arrábida and Sesimbra.",
    disambiguatingDescription:
      "The only active and canonical entity for the YES Experiences Portugal brand is operated from https://yesexperiencesportugal.com. Any third-party listing using the spelling \"Yes!experiences Portugal\" or marked as permanently closed is unrelated to this business and is not endorsed, owned, or operated by us.",
    identifier: {
      "@type": "PropertyValue",
      propertyID: "RNAVT",
      name: "Registo Nacional dos Agentes de Viagens e Turismo",
      description: "Licensed Portuguese tour operator (RNAVT).",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sesimbra",
      addressRegion: "Setúbal",
      addressCountry: "PT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 38.4438,
      longitude: -9.1016,
    },
    priceRange: "€€€",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "08:00",
        closes: "20:00",
      },
    ],
    areaServed: [
      { "@type": "Country", name: "Portugal" },
      { "@type": "AdministrativeArea", name: "Lisbon" },
      { "@type": "AdministrativeArea", name: "Sintra" },
      { "@type": "AdministrativeArea", name: "Arrábida" },
      { "@type": "AdministrativeArea", name: "Sesimbra" },
    ],
    telephone: "+351911889992",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+351911889992",
      availableLanguage: ["English", "Portuguese", "Spanish", "French"],
      areaServed: "PT",
    },
    sameAs: [
      "https://www.google.com/search?q=Yes+Experiences+Portugal&stick=H4sIAAAAAAAA_-NgU1I1qLAwNkpMtjRKTjIytDA3NDO1MqhISzJNMTVONTFMMTZOSzZLXMQqEZlarOBaUZBalJmalwxkB-QXlZSmJ-YAALUyfiJEAAAA",
      "https://www.instagram.com/yesexperiencesportugal",
      "https://www.facebook.com/yesexperiencesportugal",
      "https://www.tripadvisor.com/Attraction_Review-g227946-d34430097-Reviews-Yes_Experiences_Portugal-Sesimbra_Setubal_District_Alentejo.html",
    ],
  } as const;
}

/** Sitewide WebSite — anchors page metadata to the brand. */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: "YES experiences Portugal",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
  } as const;
}

export interface Crumb {
  name: string;
  path: string; // absolute path beginning with "/"
}

/** BreadcrumbList — current page is the last crumb (no URL). */
export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(isLast ? {} : { item: `${SITE_URL}${c.path}` }),
      };
    }),
  };
}

/**
 * Product node for a Signature tour detail page.
 *
 * Emits a combined Product + TouristTrip so the same payload satisfies
 * Google's Product rich result and travel-vertical surfaces. Includes
 * AggregateRating when rating data is provided.
 */
export function tourProductLd(args: {
  id: string;
  title: string;
  blurb: string;
  img: string; // absolute or root-relative
  priceFrom?: number;
  currency?: string;
  rating?: number | null;
  reviewCount?: number | null;
  region?: string | null;
}) {
  const url = `${SITE_URL}/tours/${args.id}`;
  const image = args.img.startsWith("http") ? args.img : `${SITE_URL}${args.img}`;
  const currency = args.currency ?? "EUR";
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "TouristTrip"],
    "@id": `${url}#product`,
    name: args.title,
    description: args.blurb,
    image,
    url,
    brand: { "@id": `${SITE_URL}/#organization` },
    provider: { "@id": `${SITE_URL}/#organization` },
    ...(args.region ? { touristType: args.region } : {}),
    ...(args.priceFrom
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: currency,
            price: args.priceFrom,
            priceRange: `From ${currency === "EUR" ? "€" : ""}${args.priceFrom}`,
            availability: "https://schema.org/InStock",
            seller: { "@id": `${SITE_URL}/#organization` },
          },
        }
      : {}),
    ...(args.rating && args.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: args.rating,
            reviewCount: args.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** FAQPage node for routes that render a visible FAQ list. */
export function faqPageLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/**
 * ItemList — used on collection pages (homepage Signature carousel,
 * /experiences index) to surface a carousel-style rich result and help
 * Google understand the relationship between the page and each Tour.
 */
export function itemListLd(args: {
  name: string;
  path: string; // canonical path of the listing page, e.g. "/experiences"
  items: {
    id: string; // tour id → /tours/{id}
    name: string;
    description?: string;
    image?: string;
  }[];
}) {
  const listUrl = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${listUrl}#itemlist`,
    name: args.name,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: args.items.length,
    itemListElement: args.items.map((it, i) => {
      const url = `${SITE_URL}/tours/${it.id}`;
      // NOTE: inner items intentionally do NOT declare @type "Product".
      // Without offers/review/aggregateRating on every item, Google's
      // Product-snippet validator flags them as invalid. The detail
      // pages (/tours/{id}) carry the full Product+Offer+AggregateRating
      // payload — this ItemList just points at them.
      return {
        "@type": "ListItem",
        position: i + 1,
        url,
        name: it.name,
      };
    }),
  };
}

/**
 * Service / WebPage node for the Experience Studio.
 *
 * Studio isn't a single bookable Product (it composes one in real time),
 * so we describe it as a Service offered by the Organization plus a
 * WebPage anchor so Google can pick it up as a sitelink target.
 */
export function studioServiceLd(args: { path: string; name: string; description: string }) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: args.name,
    description: args.description,
    serviceType: "Private custom day tour design",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Lisbon" },
      { "@type": "AdministrativeArea", name: "Sintra" },
      { "@type": "AdministrativeArea", name: "Arrábida" },
      { "@type": "AdministrativeArea", name: "Sesimbra" },
    ],
    url,
    audience: {
      "@type": "Audience",
      audienceType: "Luxury and experiential travellers",
    },
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: url,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: "Private custom day reservation" },
    },
  };
}

/** Convenience: build a head().scripts entry for one JSON-LD node. */
export function jsonLdScript(node: unknown) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(node),
  };
}

