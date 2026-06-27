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
      "https://www.google.com/maps?cid=03208810033820295776",
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

/** Convenience: build a head().scripts entry for one JSON-LD node. */
export function jsonLdScript(node: unknown) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(node),
  };
}
