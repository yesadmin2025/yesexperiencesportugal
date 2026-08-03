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

import { PHONE_TEL, SOCIAL, WEBSITE_URL } from "@/config/business-nap";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";

export const SITE_URL = WEBSITE_URL;

/**
 * Sitewide Organization — emitted on every page from __root.tsx.
 *
 * Combines TravelAgency + LocalBusiness so Google can surface it both
 * as the brand entity (knowledge panel, sitelinks) AND as a local
 * place (Maps, "near me", local pack). RNAAT licence is declared via
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
    logo: `${SITE_URL}/brand/png/yes-experiences-portugal-centered-full@2x.png`,
    image: [
      {
        "@type": "ImageObject",
        url: `${SITE_URL}/video/hero-sunset-road-poster.webp`,
        contentUrl: `${SITE_URL}/video/hero-sunset-road-poster.webp`,
        width: 1080,
        height: 1620,
        encodingFormat: "image/webp",
      },
      {
        "@type": "ImageObject",
        url: `${SITE_URL}/video/hero-sunset-road-poster.jpg`,
        contentUrl: `${SITE_URL}/video/hero-sunset-road-poster.jpg`,
        width: 1080,
        height: 1620,
        encodingFormat: "image/jpeg",
      },
    ],
    description:
      "Licensed Portuguese tour operator (RNAAT nº 31/2023), based in Sesimbra, and pioneer of real-time private tour design in Portugal — private, personalized, local journeys built around you, with hidden gems across Lisbon, Sintra, Arrábida, Sesimbra, Alentejo and the Costa Vicentina. The first Portuguese operator to let travellers design AND instantly reserve a private day in real time through the YES Experience Studio, alongside Signature days and a personal Travel Designer service for full Portugal journeys.",
    slogan:
      "Portugal, around you — private, personalized journeys with local hidden gems, designed in real time.",
    keywords:
      "private tours Portugal, personalized Portugal tours, local Portugal tours, hidden gems Portugal, Portugal around you, real-time tour builder, interactive private tour design, Arrábida wine tour, Costa Vicentina private tour, Vinho de Talha Alentejo, Tróia Comporta private day, Travel Designer Portugal",
    disambiguatingDescription:
      'The only active and canonical entity for the YES Experiences Portugal brand is operated from https://yesexperiencesportugal.com. Any third-party listing using the spelling "Yes!experiences Portugal" or marked as permanently closed is unrelated to this business and is not endorsed, owned, or operated by us.',
    knowsAbout: [
      "Private personalized tours in Portugal",
      "Local Portugal tours with hidden gems",
      "Portugal around you — journeys built around the traveller",
      "Real-time private tour design in Portugal",
      "Interactive private day-tour builder (YES Experience Studio) — first of its kind in Portugal",
      "Travel Designer service for full Portugal journeys",
      "Arrábida private wine tour from Lisbon (best-seller)",
      "Southwest Vicentine Coast private day tour from Lisbon",
      "Vinho de Talha private wine tour in the Alentejo",
      "Tróia and Comporta private day tour from Lisbon",
      "Private multi-day Portugal itineraries",
    ],
    audience: [
      {
        "@type": "Audience",
        audienceType: "US travelers, couples, small private groups",
        geographicArea: { "@type": "Country", name: "United States" },
      },
      {
        "@type": "Audience",
        audienceType: "Travel advisors, travel designers, travel agencies",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: REVIEW_CERTIFICATE.ratingValue,
      bestRating: REVIEW_CERTIFICATE.bestRating,
      worstRating: REVIEW_CERTIFICATE.worstRating,
      reviewCount: REVIEW_CERTIFICATE.reviewCount,
      // Independently collected and verified — public certificate:
      // https://www.trustindex.io/reviews/yesexperiencesportugal.com
    },
    award: [
      "First Portuguese tour operator to offer real-time private tour design and instant reservation through an in-house Experience Studio",
      "Recognised on Tripadvisor, Viator and GetYourGuide for the Arrábida private wine tour from Lisbon",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Private personalized day tours across Portugal — local hidden gems, designed around you",
      itemListElement: [
        {
          "@type": "Offer",
          position: 1,
          url: `${SITE_URL}/arrabida-wine-tour`,
          category: "Private day tour",
          itemOffered: {
            "@type": "TouristTrip",
            "@id": `${SITE_URL}/tours/arrabida-wine-allinclusive#trip`,
            name: "Arrábida Private Wine Tour from Lisbon",
            description:
              "Best-seller. Private, personalized day in the Arrábida Natural Park with local family wineries in Azeitão, cliff-top hidden viewpoints and a slow lunch. YES's most-recognised experience across Tripadvisor, Viator and GetYourGuide.",
            url: `${SITE_URL}/arrabida-wine-tour`,
            touristType: ["Wine lovers", "Couples", "Small private groups"],
            provider: { "@id": `${SITE_URL}/#organization` },
          },
        },
        {
          "@type": "Offer",
          position: 2,
          url: `${SITE_URL}/tours/southwest-vicentine-coast`,
          category: "Private day tour",
          itemOffered: {
            "@type": "TouristTrip",
            "@id": `${SITE_URL}/tours/southwest-vicentine-coast#trip`,
            name: "Southwest Vicentine Coast — Secret Paradise from Lisbon",
            description:
              "One of the most unique private day tours in Portugal — Porto Covo, Vila Nova de Milfontes, the Natural Park of Southwest Alentejo and Costa Vicentina, and Odeceixe. Raw, quiet Atlantic hidden gems rarely reached from Lisbon.",
            url: `${SITE_URL}/tours/southwest-vicentine-coast`,
            touristType: ["Slow travellers", "Nature and coastal scenery lovers"],
            provider: { "@id": `${SITE_URL}/#organization` },
          },
        },
        {
          "@type": "Offer",
          position: 3,
          url: `${SITE_URL}/tours/roman-heritage-alentejo`,
          category: "Private day tour",
          itemOffered: {
            "@type": "TouristTrip",
            "@id": `${SITE_URL}/tours/roman-heritage-alentejo#trip`,
            name: "Vinho de Talha — Ancient Clay-Amphora Wine Tour in the Alentejo",
            description:
              "Private, personalized day inside one of Portugal's rarest local wine traditions — vinho de talha, fermented in Roman-style clay amphorae in the Alentejo. Family cellars, long lunches and living heritage — a hidden gem for wine and culture travellers.",
            url: `${SITE_URL}/tours/roman-heritage-alentejo`,
            touristType: ["Wine travellers", "Heritage travellers"],
            provider: { "@id": `${SITE_URL}/#organization` },
          },
        },
        {
          "@type": "Offer",
          position: 4,
          url: `${SITE_URL}/tours/troia-comporta`,
          category: "Private day tour",
          itemOffered: {
            "@type": "TouristTrip",
            "@id": `${SITE_URL}/tours/troia-comporta#trip`,
            name: "Tróia & Comporta Private Day from Lisbon",
            description:
              "Private, personalized day across the Sado estuary to Tróia and Comporta — rice fields, pine forests, hidden white-sand beaches and Portugal's quiet luxury coast.",
            url: `${SITE_URL}/tours/troia-comporta`,
            touristType: ["Beach lovers", "Quiet-luxury travellers", "Couples"],
            provider: { "@id": `${SITE_URL}/#organization` },
          },
        },
      ],
    },
    makesOffer: [
      {
        "@type": "Offer",
        name: "YES Experience Studio — design and reserve your private day in real time",
        description:
          "Portugal's first in-house real-time private tour builder: choose the mood, rhythm and route, see the live price update, and reserve instantly. Private, personalized, local — designed by you, around you.",
        url: `${SITE_URL}/experience-studio`,
        category: "Interactive private tour design",
      },
      {
        "@type": "Offer",
        name: "YES Travel Designer — full Portugal journeys, designed for you",
        description:
          "A local Travel Designer composes full private journeys across Portugal, from a few days to a full trip, shaped around your time, rhythm and interests. Personalized itineraries built around you, with local hidden gems. Delivered as a curated travel file.",
        url: `${SITE_URL}/multi-day`,
        category: "Bespoke multi-day Portugal travel design",
      },
    ],
    identifier: {
      "@type": "PropertyValue",
      propertyID: "RNAAT",
      value: "nº 31/2023",
      name: "Registo Nacional dos Agentes de Viagens e Turismo",
      description: "Licensed Portuguese tour operator — RNAAT nº 31/2023.",
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
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
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
      { "@type": "AdministrativeArea", name: "Alentejo" },
      { "@type": "AdministrativeArea", name: "Costa Vicentina" },
      { "@type": "AdministrativeArea", name: "Comporta" },
      { "@type": "AdministrativeArea", name: "Tróia" },
    ],
    telephone: PHONE_TEL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: PHONE_TEL,
      availableLanguage: ["English", "Portuguese", "Spanish", "French"],
      areaServed: "PT",
    },
    foundingDate: "2022",
    founder: { "@id": `${SITE_URL}/about#nidia-almeida` },
    employee: [{ "@id": `${SITE_URL}/about#nidia-almeida` }],
    sameAs: [
      SOCIAL.google,
      SOCIAL.instagram,
      SOCIAL.facebook,
      SOCIAL.tripadvisor,
      SOCIAL.viator,
      "https://www.linkedin.com/in/nidiadealmeida",
    ].filter(Boolean),
  } as const;
}

/**
 * Sitewide WebSite — anchors page metadata to the brand and advertises the
 * real, working site search at /search?q= (see src/routes/search.tsx).
 */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: "YES experiences Portugal",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  } as const;
}

/**
 * Founder Person node — emitted on /about so Google can attach an
 * Expertise/Authoritativeness signal to a real human behind the brand.
 * Re-used as the `author` of editorial Local Stories articles.
 */
export const FOUNDER_ID = `${SITE_URL}/about#nidia-almeida`;

export function personFounderLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_ID,
    name: "Nidia Almeida",
    givenName: "Nidia",
    familyName: "Almeida",
    jobTitle: "Founder & Lead Experience Designer",
    description:
      "Portuguese host and founder of YES Experiences Portugal. Designs private Signature days and bespoke journeys in Lisbon, Sintra, Arrábida, Sesimbra and the Alentejo since 2022.",
    nationality: { "@type": "Country", name: "Portugal" },
    knowsLanguage: ["en", "pt"],
    knowsAbout: [
      "Private day tours in Portugal",
      "Lisbon, Sintra, Arrábida and Sesimbra travel",
      "Setúbal Peninsula wineries",
      "Bespoke multi-day Portugal journeys",
      "Luxury experiential travel",
    ],
    worksFor: { "@id": `${SITE_URL}/#organization` },
    url: `${SITE_URL}/about`,
    sameAs: ["https://www.linkedin.com/in/nidiadealmeida"],
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
 * BlogPosting node for a Local Stories article. Reused by both the
 * static-content branch and the DB-post branch so the two cannot drift.
 *
 * `imageUrl` must be an absolute URL (or a root-relative "/…" path that the
 * helper will prefix with SITE_URL).
 */
export function localStoryArticleLd(args: {
  slug: string;
  headline: string;
  name?: string;
  description?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
}) {
  const url = `${SITE_URL}/local-stories/${args.slug}`;
  const abs = (u?: string | null) =>
    !u ? undefined : u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
  const image = abs(args.imageUrl);
  const author = args.authorName
    ? { "@type": "Person" as const, name: args.authorName }
    : {
        "@type": "Person" as const,
        "@id": FOUNDER_ID,
        name: "Nidia Almeida",
        url: `${SITE_URL}/about`,
        sameAs: ["https://www.linkedin.com/in/nidiadealmeida"],
      };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.headline,
    ...(args.name ? { name: args.name } : {}),
    ...(args.description ? { description: args.description } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(image ? { image: [image] } : {}),
    ...(args.datePublished ? { datePublished: args.datePublished } : {}),
    ...(args.dateModified || args.datePublished
      ? { dateModified: args.dateModified ?? args.datePublished! }
      : {}),
    inLanguage: "en",
    author,
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "YES Experiences Portugal",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/brand/png/yes-experiences-portugal-centered-full@2x.png`,
      },
    },
  };
}

/**
 * Convert a human-readable duration ("8–9h", "6+h", "Full Day") into an
 * ISO 8601 duration suitable for schema.org. Returns `null` when no
 * sensible mapping exists.
 */
export function durationToIso8601(durationHours?: string | null): string | null {
  if (!durationHours) return null;
  const s = String(durationHours).toLowerCase();
  // Match the first integer ("8" from "8–9h", "6" from "6+h").
  const m = s.match(/(\d{1,2})/);
  if (m) return `PT${m[1]}H`;
  if (s.includes("full")) return "PT8H";
  if (s.includes("half")) return "PT4H";
  return null;
}

interface StopForLd {
  label: string;
  story?: string;
}

/**
 * Product node for a Signature tour detail page.
 *
 * Emits a combined Product + TouristTrip so the same payload satisfies
 * Google's Product rich result and travel-vertical surfaces. Includes
 * AggregateRating when rating data is provided, ISO 8601 duration, and
 * an itinerary ItemList when stops are supplied — these are the fields
 * that drive richer experience cards on Google.
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
  durationHours?: string | null;
  stops?: StopForLd[];
}) {
  const url = `${SITE_URL}/tours/${args.id}`;

  const image = args.img.startsWith("http") ? args.img : `${SITE_URL}${args.img}`;
  const currency = args.currency ?? "EUR";
  const iso = durationToIso8601(args.durationHours ?? null);
  const stops = (args.stops ?? []).filter((s) => s && s.label);
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
    category: "Private day tour",
    ...(args.region ? { touristType: args.region } : {}),
    ...(iso ? { duration: iso } : {}),
    ...(stops.length
      ? {
          itinerary: {
            "@type": "ItemList",
            numberOfItems: stops.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            itemListElement: stops.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "TouristAttraction",
                name: s.label,
                ...(s.story ? { description: s.story } : {}),
              },
            })),
          },
        }
      : {}),
    ...(args.priceFrom
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: currency,
            price: args.priceFrom,
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
      result: { "@type": "Reservation", name: `${args.title} reservation` },
    },
  };
}

/**
 * Tailored variant — the same Signature, opened in the customization
 * flow. Emitted on /tours/$tourId/tailor so Google understands the page
 * as a bookable, customizable version of the parent Product (not a
 * duplicate). Canonical stays on the parent /tours/$tourId page.
 */
export function tourTailorProductLd(args: {
  id: string;
  title: string;
  blurb: string;
  img: string;
  priceFrom?: number;
  currency?: string;
  region?: string | null;
  durationHours?: string | null;
}) {
  const parent = `${SITE_URL}/tours/${args.id}`;
  const url = `${parent}/tailor`;
  const image = args.img.startsWith("http") ? args.img : `${SITE_URL}${args.img}`;
  const currency = args.currency ?? "EUR";
  const iso = durationToIso8601(args.durationHours ?? null);
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "TouristTrip"],
    "@id": `${url}#product`,
    name: `Tailor — ${args.title}`,
    description: `Customize the ${args.title} Signature: keep the route and story, adjust pace, timing and small additions before booking.`,
    image,
    url,
    isVariantOf: {
      "@type": "ProductGroup",
      "@id": `${parent}#product-group`,
      productGroupID: args.id,
      name: args.title,
      url: parent,
    },
    brand: { "@id": `${SITE_URL}/#organization` },
    provider: { "@id": `${SITE_URL}/#organization` },
    category: "Private customizable day tour",
    ...(args.region ? { touristType: args.region } : {}),
    ...(iso ? { duration: iso } : {}),
    ...(args.priceFrom
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: currency,
            price: args.priceFrom,

            availability: "https://schema.org/InStock",
            seller: { "@id": `${SITE_URL}/#organization` },
          },
        }
      : {}),
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
      result: { "@type": "Reservation", name: `${args.title} — tailored reservation` },
    },
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
      // payload. We DO declare TouristTrip on the inner item — it has no
      // required-field validator, so it enriches travel surfaces without
      // risking an invalid Product snippet.
      const image = it.image
        ? it.image.startsWith("http")
          ? it.image
          : `${SITE_URL}${it.image}`
        : undefined;
      return {
        "@type": "ListItem",
        position: i + 1,
        url,
        name: it.name,
        item: {
          "@type": "TouristTrip",
          "@id": `${url}#trip`,
          name: it.name,
          url,
          ...(it.description ? { description: it.description } : {}),
          ...(image ? { image } : {}),
          provider: { "@id": `${SITE_URL}/#organization` },
        },
      };
    }),
  };
}

/**
 * Multi-day / editorial itinerary node.
 *
 * Describes the *shape* of a journey (day-by-day) without inventing a
 * bookable product: each day becomes a TouristDestination inside the
 * trip's `itinerary` ItemList, which is the structure Google's travel
 * surfaces read. Days may link to a real Signature page via `path`.
 */
export function tripItineraryLd(args: {
  path: string;
  name: string;
  description: string;
  touristType?: string;
  days: { name: string; description?: string; path?: string }[];
}) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: args.name,
    description: args.description,
    url,
    mainEntityOfPage: url,
    ...(args.touristType ? { touristType: args.touristType } : {}),
    provider: { "@id": `${SITE_URL}/#organization` },
    itinerary: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: args.days.length,
      itemListElement: args.days.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: d.name,
        item: {
          "@type": "TouristDestination",
          name: d.name,
          ...(d.description ? { description: d.description } : {}),
          ...(d.path ? { url: `${SITE_URL}${d.path}` } : {}),
          includesAttraction: { "@type": "TouristAttraction", name: d.name },
        },
      })),
    },
    potentialAction: {
      "@type": "PlanAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/multi-day`,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
    },
  };
}

/**
 * Reservation node for a confirmed booking (receipt / confirmation
 * pages). These pages are noindex, so this exists for machine readers
 * (email/receipt parsers, assistants), not for search snippets — it is
 * emitted client-side once the real Stripe session has loaded, never
 * with placeholder values.
 */
export function tourReservationLd(args: {
  reservationId: string;
  name: string;
  status: "confirmed" | "pending";
  totalPrice?: number | null;
  currency?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  bookingTime?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Reservation",
    reservationId: args.reservationId,
    reservationStatus:
      args.status === "confirmed"
        ? "https://schema.org/ReservationConfirmed"
        : "https://schema.org/ReservationPending",
    reservationFor: {
      "@type": "TouristTrip",
      name: args.name,
      provider: { "@id": `${SITE_URL}/#organization` },
    },
    provider: { "@id": `${SITE_URL}/#organization` },
    ...(args.bookingTime ? { bookingTime: args.bookingTime } : {}),
    ...(typeof args.totalPrice === "number"
      ? { totalPrice: args.totalPrice, priceCurrency: (args.currency ?? "EUR").toUpperCase() }
      : {}),
    ...(args.customerName || args.customerEmail
      ? {
          underName: {
            "@type": "Person",
            ...(args.customerName ? { name: args.customerName } : {}),
            ...(args.customerEmail ? { email: args.customerEmail } : {}),
          },
        }
      : {}),
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
    serviceType: "Private personalized day tour design (real-time)",
    category: "Interactive private tour design",
    provider: { "@id": `${SITE_URL}/#organization` },
    brand: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      { "@type": "Country", name: "Portugal" },
      { "@type": "AdministrativeArea", name: "Lisbon" },
      { "@type": "AdministrativeArea", name: "Sintra" },
      { "@type": "AdministrativeArea", name: "Arrábida" },
      { "@type": "AdministrativeArea", name: "Sesimbra" },
      { "@type": "AdministrativeArea", name: "Alentejo" },
      { "@type": "AdministrativeArea", name: "Costa Vicentina" },
    ],
    url,
    audience: {
      "@type": "Audience",
      audienceType:
        "Luxury and experiential travellers seeking private, personalized, local Portugal days with hidden gems",
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

/**
 * Travel Designer Service — /multi-day.
 *
 * A local human designer composes full private multi-day Portugal journeys.
 * Emitted as Service so Google can distinguish it from the Studio (day) and
 * from a single bookable Product.
 */
export function travelDesignerServiceLd(args: {
  path: string;
  name?: string;
  description?: string;
}) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: args.name ?? "YES Travel Designer — full Portugal journeys, designed for you",
    description:
      args.description ??
      "A local Travel Designer composes full private journeys across Portugal — private, personalized, built around your time, rhythm and interests, with local hidden gems. From a few days to a full journey across Portugal, delivered as a curated travel file.",
    serviceType: "Bespoke multi-day Portugal travel design",
    category: "Private personalized multi-day travel design",
    provider: { "@id": `${SITE_URL}/#organization` },
    brand: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Portugal" },
    url,
    audience: {
      "@type": "Audience",
      audienceType:
        "Couples, honeymooners, families and small private groups seeking a personalized multi-day Portugal journey",
    },
    potentialAction: {
      "@type": "PlanAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: url,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
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

/**
 * Review nodes for a Local Story article whose linked Signature tour has
 * first-party guest reviews. Emitted ONLY when matching review content is
 * also rendered visibly on the page (Google requirement). `itemReviewed`
 * points at the linked Signature tour Product so the credibility signal
 * attaches to the experience itself.
 *
 * STRICT VISIBLE-PARITY CONTRACT
 * Every field below MUST also be rendered on the page. The visible Guest
 * notes block consumes the same `normalizeLocalStoryReviews()` output, so
 * the two surfaces never drift. If you add a field here, render it; if you
 * remove a field from the UI, remove it here.
 */
export type LocalStoryReviewInput = {
  id: string;
  rating: number;
  body: string;
  title: string | null;
  reviewer_name: string | null;
  reviewer_country: string | null;
  published_at: string;
};

export type NormalizedLocalStoryReview = {
  id: string;
  /** Integer 1–5, exactly what the visible star row renders. Null = no visible rating, omit reviewRating. */
  ratingValue: number | null;
  /** Verbatim body — rendered on page and emitted as reviewBody. Null = no visible body, review is skipped. */
  body: string | null;
  /** Null when no visible title is rendered; JSON-LD omits `name` then. */
  title: string | null;
  /** Null when no visible byline name is rendered; JSON-LD omits `author` then. */
  authorName: string | null;
  /** Null when no visible country chip is rendered. */
  country: string | null;
  /** ISO date — null when no visible <time> is rendered; JSON-LD omits `datePublished` then. */
  publishedAt: string | null;
};

const FALLBACK_AUTHOR = "Verified guest";

export function normalizeLocalStoryReviews(
  reviews: LocalStoryReviewInput[],
): NormalizedLocalStoryReview[] {
  const out: NormalizedLocalStoryReview[] = [];
  for (const r of reviews) {
    const body = r.body?.trim() ? r.body.trim() : null;
    if (!body) continue; // No visible quote → skip review entirely.

    const ratingRaw = Number(r.rating);
    const ratingValue =
      Number.isFinite(ratingRaw) && ratingRaw >= 1
        ? Math.max(1, Math.min(5, Math.round(ratingRaw)))
        : null;

    const title = r.title?.trim() ? r.title.trim() : null;

    const trimmedName = r.reviewer_name?.trim();
    const authorName = trimmedName
      ? trimmedName
      : // We always render *some* byline visibly when at least one byline
        // segment exists. If everything is missing we omit author below.
        FALLBACK_AUTHOR;

    const country = r.reviewer_country?.trim() ? r.reviewer_country.trim() : null;

    const publishedAt =
      r.published_at && !Number.isNaN(new Date(r.published_at).getTime()) ? r.published_at : null;

    out.push({
      id: r.id,
      ratingValue,
      body,
      title,
      authorName,
      country,
      publishedAt,
    });
  }
  return out;
}

export function localStoryReviewsLd(args: {
  signatureSlug: string;
  signatureTitle: string;
  reviews: NormalizedLocalStoryReview[];
}) {
  const productId = `${SITE_URL}/tours/${args.signatureSlug}#product`;
  const nodes: Record<string, unknown>[] = [];
  for (const r of args.reviews) {
    // reviewBody is the one mandatory anchor — if it is missing we skip
    // the whole node so we never emit a Review with no visible quote.
    if (!r.body) continue;

    const node: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Review",
      "@id": `${SITE_URL}/local-stories#review-${r.id}`,
      reviewBody: r.body,
      itemReviewed: {
        "@type": "Product",
        "@id": productId,
        name: args.signatureTitle,
        url: `${SITE_URL}/tours/${args.signatureSlug}`,
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
    };

    if (r.ratingValue !== null) {
      node.reviewRating = {
        "@type": "Rating",
        ratingValue: r.ratingValue,
        bestRating: 5,
        worstRating: 1,
      };
    }
    if (r.title) node.name = r.title;
    if (r.publishedAt) node.datePublished = r.publishedAt;
    if (r.authorName) {
      const author: Record<string, unknown> = {
        "@type": "Person",
        name: r.authorName,
      };
      if (r.country) author.nationality = r.country;
      node.author = author;
    }

    nodes.push(node);
  }
  return nodes;
}

/**
 * hreflang link entries for English-language landing pages that target
 * the US and Canada markets. Page content is identical for both
 * locales, so en-US, en-CA and x-default all point at the same URL —
 * Google's recommended pattern when one English page serves multiple
 * English-speaking regions.
 */
export function hreflangUsCaLinks(path: string) {
  const url = `${SITE_URL}${path}`;
  return [
    { rel: "alternate", hrefLang: "en", href: url },
    { rel: "alternate", hrefLang: "en-US", href: url },
    { rel: "alternate", hrefLang: "en-CA", href: url },
    { rel: "alternate", hrefLang: "x-default", href: url },
  ] as const;
}

/**
 * Per-page Organization node that reinforces US/Canada targeting on a
 * landing page. Reuses the sitewide Organization @id so linked-data
 * consumers merge it with the canonical entity rather than creating a
 * duplicate brand. Adds `areaServed`, `audience` and `knowsLanguage`
 * scoped to North-American English travellers.
 */
export function organizationUsCaAudienceLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    knowsLanguage: ["en", "en-US", "en-CA"],
    areaServed: [
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "Canada" },
    ],
    audience: {
      "@type": "Audience",
      audienceType: "International travellers from the United States and Canada",
      geographicArea: [
        { "@type": "Country", name: "United States" },
        { "@type": "Country", name: "Canada" },
      ],
    },
  } as const;
}

/**
 * Corporate Service — /corporate.
 *
 * Corporate work isn't a single bookable Product: it's a designed and
 * coordinated programme. Emitted as a Service provided by the sitewide
 * Organization, served across the whole country (never region-scoped),
 * covering team building, incentives, retreats, off-sites and private
 * corporate groups from leadership teams to 100+ guests.
 */
export function corporateServiceLd(args: { path: string }) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: "Corporate experiences, team building and incentives in Portugal",
    description:
      "Private corporate events, team building, incentive travel, executive retreats, off-sites, client hosting and company celebrations across Portugal — designed and coordinated locally, from leadership teams to corporate groups of 100+.",
    serviceType: [
      "Corporate events",
      "Team building",
      "Incentive travel",
      "Corporate retreats",
      "Executive off-sites",
      "Client hosting and VIP programmes",
      "Private group experiences",
    ],
    category: "Corporate event design and coordination",
    provider: { "@id": `${SITE_URL}/#organization` },
    brand: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Portugal" },
    url,
    audience: {
      "@type": "Audience",
      audienceType:
        "Companies, leadership teams, event organisers, DMCs and incentive planners, from small executive groups to corporate groups of 100+",
    },
    potentialAction: {
      "@type": "PlanAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/contact`,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
    },
  };
}

/**
 * Moments Service — /proposal-in-portugal.
 *
 * Private proposals, anniversaries, birthdays and celebrations. Emitted as a
 * Service so Google separates the occasion entity from day-tour Products.
 */
export function momentsServiceLd(args: { path: string }) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: "Private proposals, anniversaries and celebrations in Portugal",
    description:
      "Private proposal planning, anniversary and birthday experiences, honeymoon days and special-occasion celebrations across Portugal — discreetly designed and coordinated by a local team, from Lisbon and Sintra to Arrábida, Alentejo and the Atlantic coast.",
    serviceType: [
      "Private proposal planning",
      "Anniversary experiences",
      "Birthday experiences",
      "Honeymoon days",
      "Private celebrations",
      "Special occasion travel",
    ],
    category: "Special occasion experience design",
    provider: { "@id": `${SITE_URL}/#organization` },
    brand: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Portugal" },
    url,
    audience: {
      "@type": "Audience",
      audienceType:
        "Couples planning a proposal, anniversary, honeymoon or private celebration in Portugal",
    },
    potentialAction: {
      "@type": "PlanAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: url,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
    },
  };
}

/**
 * Service entity graph — emitted once on the homepage.
 *
 * Communicates the brand → service hierarchy so search engines do not reduce
 * YES Experiences Portugal to a single day-tour catalogue. Each item points at
 * the page that owns the entity.
 */
export function serviceEntityListLd() {
  const services: { path: string; name: string; description: string }[] = [
    {
      path: "/experiences",
      name: "Signature Experiences",
      description:
        "Curated private day experiences across Portugal, ready to reserve with a dedicated local guide and vehicle.",
    },
    {
      path: "/experience-studio",
      name: "YES Experience Studio",
      description:
        "Design a private Portugal experience online in real time — route, stops and pricing evolve as you choose, then reserve directly or have it reviewed locally.",
    },
    {
      path: "/portugal-travel-designer",
      name: "Portugal Travel Designer",
      description:
        "Bespoke planning of complete multi-day private journeys across Portugal, distinct from a single private day tour.",
    },
    {
      path: "/proposal-in-portugal",
      name: "Moments — proposals and celebrations",
      description:
        "Private proposals, anniversaries, birthdays and special-occasion experiences planned discreetly across Portugal.",
    },
    {
      path: "/corporate",
      name: "Corporate and incentive travel",
      description:
        "Corporate events, team building, incentives, executive retreats and company off-sites in Portugal, from leadership teams to groups of 100+.",
    },
    {
      path: "/trade",
      name: "Travel advisors and trade partnerships",
      description:
        "Local Portugal ground support for travel advisors, designers and agencies — FIT travel, private guiding and destination coordination across the country.",
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/#services`,
    name: "YES Experiences Portugal — services",
    description:
      "The distinct services offered by YES Experiences Portugal across the whole country, beyond day tours from Lisbon.",
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${s.path}`,
      item: {
        "@type": "Service",
        "@id": `${SITE_URL}${s.path}#service`,
        name: s.name,
        description: s.description,
        url: `${SITE_URL}${s.path}`,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Portugal" },
      },
    })),
  };
}
