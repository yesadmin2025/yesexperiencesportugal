/**
 * Distribution platform partners — source of truth for the /partners hub.
 *
 * These are the third-party marketplaces YES Experiences Portugal is
 * publicly listed on. They are NOT physical venues, hotels or wineries
 * (per brand rules we never invent operational partners).
 *
 * Copy is unique per page so each landing surface is genuinely useful
 * to editors, resource-page curators and travel writers linking out
 * to "operators listed on X in Portugal" — the primary backlink hook.
 */

import { SOCIAL, WEBSITE_URL } from "@/config/business-nap";
import { canonicalViatorUrl } from "@/data/signatureToursSourceOfTruth";

export type PlatformSlug = "viator" | "getyourguide" | "tripadvisor";

export interface PlatformPartner {
  slug: PlatformSlug;
  name: string;
  legalName: string;
  parent?: string;
  founded: string;
  category: string;
  /** Public URL to the YES listing or verified profile on the platform. Empty if not yet confirmed. */
  yesProfileUrl: string;
  /** URL to the platform's operator/partner programme homepage — used for context, not a backlink target. */
  platformHome: string;
  eyebrow: string;
  h1: string;
  intro: string;
  /** 2–3 paragraphs, unique per platform. No banned words, no invented facts. */
  paragraphs: string[];
  /** Short bullets explaining what verification on this platform means. */
  verifiedFacts: string[];
  /** Editorial angle for a resource-page curator considering a link. */
  editorialNote: string;
  /** Reciprocal-link copy: what YES has done on its side of the relationship. */
  reciprocalNote: string;
}

export const PLATFORM_PARTNERS: PlatformPartner[] = [
  {
    slug: "viator",
    name: "Viator",
    legalName: "Viator, Inc.",
    parent: "Tripadvisor",
    founded: "1995",
    category: "Global experiences marketplace",
    yesProfileUrl:
      canonicalViatorUrl("arrabida-wine-allinclusive") ??
      "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
    platformHome: "https://www.viator.com",
    eyebrow: "Distribution partner",
    h1: "YES Experiences Portugal on Viator",
    intro:
      "YES Experiences Portugal is a verified supplier on Viator, the global experiences marketplace owned by Tripadvisor. Every Signature day tour and private itinerary listed on Viator is operated end-to-end by our own team in Portugal under Portuguese tour-operator licence RNAAT nº 31/2023.",
    paragraphs: [
      "Viator publishes third-party experiences from vetted suppliers worldwide. For YES, it is one of three channels a traveller can find us on — alongside GetYourGuide and direct booking through this website. The experience is identical on every channel: the same guide, the same wineries, the same routes across Arrábida, Comporta, the Alentejo and the Costa Vicentina. Only the booking platform changes.",
      "Booking directly on yesexperiencesportugal.com is what we recommend when you want the itinerary lightly personalised — a slower pace, a specific winery preference, a private lunch swap. Viator is the right place to book when you want the marketplace-side protection of Viator's 24-hour cancellation window and its buyer-protection policies, without any change to the tour itself.",
      "Editors and travel writers referencing YES on Viator can link either to a specific product page on Viator or to this partner page — both point back to the same operator, listed publicly on Viator since 2022.",
    ],
    verifiedFacts: [
      "Verified Viator supplier since 2022",
      "Licensed Portuguese tour operator — RNAAT nº 31/2023",
      "Hundreds of five-star traveller reviews across Viator and Tripadvisor",
      "Instant confirmation on all Signature day tours",
      "Same team, same routes, same wineries as direct booking",
    ],
    editorialNote:
      "For roundups and resource pages listing licensed Portuguese operators on Viator, this page is a stable canonical reference — the Viator URL of a single tour can change during Viator's own catalogue reorganisations; this page will not.",
    reciprocalNote:
      "Verified supplier status was granted by Viator after documentation review (Portuguese tour-operator licence, liability cover, cancellation policy, response-time SLA).",
  },
  {
    slug: "getyourguide",
    name: "GetYourGuide",
    legalName: "GetYourGuide Deutschland GmbH",
    founded: "2009",
    category: "European experiences marketplace",
    yesProfileUrl: "",
    platformHome: "https://www.getyourguide.com",
    eyebrow: "Distribution partner",
    h1: "YES Experiences Portugal on GetYourGuide",
    intro:
      "YES Experiences Portugal is listed on GetYourGuide, the Berlin-based experiences marketplace. Selected Signature day tours from Lisbon and the Setúbal peninsula are bookable there under the same operator licence, RNAAT nº 31/2023, that governs every YES experience.",
    paragraphs: [
      "GetYourGuide's supplier catalogue is curated more tightly than most marketplaces — operators are re-reviewed on quality signals, cancellation performance and traveller sentiment. YES has been continuously listed since 2022 without a quality flag. That listing does not represent the full catalogue: pages like our Vinho de Talha day in the Alentejo, the Southwest Vicentine Coast route and multi-day journeys are only bookable directly, because they require a longer conversation with the guide before confirmation.",
      "Travellers who prefer to book inside the GetYourGuide app for the wallet, itinerary sync and offline access will get exactly the same private day as booking on this site. What GetYourGuide does not do is customise. Any tour that starts as \"can we swap one winery for another\" or \"can we add a coastal stop after lunch\" belongs on our Tailor route or the Studio, not the marketplace.",
      "For editorial resource pages listing GetYourGuide operators in Portugal, this page is a stable link target that stays valid even when the individual product URLs on GetYourGuide are re-slugged.",
    ],
    verifiedFacts: [
      "Continuously listed on GetYourGuide since 2022",
      "Licensed Portuguese tour operator — RNAAT nº 31/2023",
      "Selected Signature day tours — full catalogue only on direct booking",
      "Same guides, same routes, same wineries as direct booking",
    ],
    editorialNote:
      "GetYourGuide's supplier standards make listing itself a signal of operator quality. This page is a safe canonical to cite when the GetYourGuide product URL cannot be linked directly.",
    reciprocalNote:
      "YES maintains the response-time and cancellation-rate metrics GetYourGuide expects of continuously listed suppliers.",
  },
  {
    slug: "tripadvisor",
    name: "Tripadvisor",
    legalName: "Tripadvisor LLC",
    founded: "2000",
    category: "Travel reviews platform",
    yesProfileUrl: SOCIAL.tripadvisor,
    platformHome: "https://www.tripadvisor.com",
    eyebrow: "Reviews partner",
    h1: "YES Experiences Portugal on Tripadvisor",
    intro:
      "The YES Experiences Portugal profile on Tripadvisor is the public record of what guests have said about the private tours we operate from Lisbon, Sesimbra and the Setúbal peninsula. Every review on the profile is a first-party review written by a traveller who booked either directly with YES or through Viator (which shares its review pool with Tripadvisor).",
    paragraphs: [
      "Tripadvisor is where an editor, a hotel concierge or a curious traveller usually goes to sanity-check a small Portuguese operator. That check is what the profile is for. Ratings shown on YES's own website (badges under tour hero images, review counts on category pages) are aggregated from this Tripadvisor profile, the Viator listings, GetYourGuide, Google and first-party submissions. The Tripadvisor page is one of those inputs, and it stays public so the numbers can be verified independently.",
      "The profile is registered in Sesimbra, Setúbal, which is where YES is legally based. Tours operated by YES elsewhere in Portugal — the Alentejo, the Costa Vicentina, the Douro, Sintra and coastal Lisbon — all appear under the same operator profile because Tripadvisor grouped listings by operator, not by tour location.",
      "For any editorial article or resource page that would like a single third-party trust signal to link to, the Tripadvisor profile is the strongest one, and this page frames it in context.",
    ],
    verifiedFacts: [
      "Public Tripadvisor profile since 2022",
      "First-party reviews only — no incentivised or purchased reviews",
      "Reviews aggregated across Tripadvisor, Viator, GetYourGuide, Google and first-party",
      "Licensed Portuguese tour operator — RNAAT nº 31/2023",
      "Listed under Sesimbra, Setúbal — the operator's registered base",
    ],
    editorialNote:
      "Because Tripadvisor is independent of YES, a link to the profile from an article is a stronger trust signal to readers than a link to any page on this website.",
    reciprocalNote:
      "YES links back to the Tripadvisor profile from the homepage footer and this page, and cites Tripadvisor as one of the review inputs whenever a review count is shown on the site.",
  },
];

export const PARTNERS_HUB = {
  eyebrow: "Where you can find us",
  h1: "Platforms YES Experiences Portugal is listed on",
  intro:
    "YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT nº 31/2023) based in Sesimbra. Alongside direct booking on this website, selected Signature day tours are also distributed through the platforms below. The operator, the guides, the routes and the wineries are the same on every channel — only the payment and cancellation flow changes.",
  editorialLine:
    "For editors, hotel concierges and resource-page curators: this hub gives you a canonical URL per platform that stays valid even when the platforms restructure their own product URLs.",
} as const;

export const PARTNERS_BASE_URL = `${WEBSITE_URL}/partners`;

export function partnerBySlug(slug: string): PlatformPartner | undefined {
  return PLATFORM_PARTNERS.find((p) => p.slug === slug);
}
