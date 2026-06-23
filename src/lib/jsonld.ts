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

/** Sitewide Organization — used by Google's knowledge panel. */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${SITE_URL}/#organization`,
    name: "YES experiences Portugal",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/svg/yes-experiences-portugal-horizontal-full.svg`,
    image: `${SITE_URL}/brand/svg/yes-experiences-portugal-horizontal-full.svg`,
    description:
      "Private, meaningful Portugal experiences — Signature days, an Experience Studio that designs and reserves in minutes, bespoke multi-day journeys, and private occasions in Lisbon, Sintra, Arrábida and Sesimbra.",
    areaServed: [
      { "@type": "Country", name: "Portugal" },
      { "@type": "AdministrativeArea", name: "Lisbon" },
      { "@type": "AdministrativeArea", name: "Sintra" },
      { "@type": "AdministrativeArea", name: "Arrábida" },
      { "@type": "AdministrativeArea", name: "Sesimbra" },
    ],
    sameAs: [
      "https://share.google/7bTnRlabRJhLWACvE",
      "https://www.instagram.com/yesexperiencespt",
      "https://www.tripadvisor.com/Attraction_Review-g189158-d23586075-Reviews-Yes_Experiences_Portugal-Lisbon_Lisbon_District_Central_Portugal.html",
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

/** Product node for a Signature tour detail page. */
export function tourProductLd(args: {
  id: string;
  title: string;
  blurb: string;
  img: string; // absolute or root-relative
  priceFrom?: number;
  currency?: string;
}) {
  const url = `${SITE_URL}/tours/${args.id}`;
  const image = args.img.startsWith("http") ? args.img : `${SITE_URL}${args.img}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: args.title,
    description: args.blurb,
    image,
    url,
    brand: { "@id": `${SITE_URL}/#organization` },
    ...(args.priceFrom
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: args.currency ?? "EUR",
            price: args.priceFrom,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

/** Convenience: build a head().scripts entry for one JSON-LD node. */
export function jsonLdScript(node: unknown) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(node),
  };
}
