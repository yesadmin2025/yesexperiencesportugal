import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  jsonLdScript,
  breadcrumbLd,
  SITE_URL,
  hreflangUsCaLinks,
  organizationUsCaAudienceLd,
} from "@/lib/jsonld";
import { withAggregateAndReviews } from "@/lib/aggregate-review-schema";
import { LandingTourCredibility } from "@/components/LandingTourCredibility";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";

const PAGE_PATH = "/arrabida-wine-tour";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "arrabida-wine-allinclusive";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Arrábida Wine Tour — Private Day from Lisbon to Azeitão & Setúbal";
const DESCRIPTION =
  "Private Arrábida wine tour from Lisbon. Three family wineries in Azeitão, the Setúbal market, a long Portuguese lunch and a panoramic Atlantic close. Designed by a licensed local team.";

const productLd = {
  "@context": "https://schema.org",
  "@type": ["Product", "TouristTrip"],
  "@id": `${PAGE_URL}#product`,
  name: TITLE,
  description: DESCRIPTION,
  url: PAGE_URL,
  mainEntityOfPage: PAGE_URL,
  image: `${SITE_URL}/video/hero-sunset-road-poster.jpg`,
  isVariantOf: { "@id": `${PARENT_URL}#product` },
  brand: { "@id": `${SITE_URL}/#organization` },
  provider: { "@id": `${SITE_URL}/#organization` },
  category: "Private wine day tour",
  touristType: "Wine travellers · couples · small groups",
  duration: "PT8H",
  inLanguage: "en",
  audience: {
    "@type": "Audience",
    geographicArea: [
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "Canada" },
    ],
  },
  offers: {
    "@type": "Offer",
    url: PARENT_URL,
    priceCurrency: "EUR",
    price: 138,
    priceRange: "From €138",
    availability: "https://schema.org/InStock",
    seller: { "@id": `${SITE_URL}/#organization` },
  },
  potentialAction: {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: PARENT_URL,
      actionPlatform: [
        "https://schema.org/DesktopWebPlatform",
        "https://schema.org/MobileWebPlatform",
      ],
    },
    result: { "@type": "Reservation", name: `${TITLE} reservation` },
  },
};

export const Route = createFileRoute("/arrabida-wine-tour")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "arrabida wine tour, arrábida wine tour, private arrabida wine tour, azeitao wine tour, setubal wine tour, lisbon wine tour, moscatel de setubal tour",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "en_CA" },
    ],
    links: [
      { rel: "canonical", href: PAGE_URL },
      ...hreflangUsCaLinks(PAGE_PATH),
    ],
    scripts: [
      jsonLdScript(withAggregateAndReviews(productLd, PARENT_TOUR_ID)),
      jsonLdScript(organizationUsCaAudienceLd()),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Experiences", path: "/experiences" },
          { name: "Arrábida Wine Tour", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Arrábida · Private Wine Day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Arrábida Wine Tour —{" "}
              <SectionTitle.Em>Azeitão & Setúbal, from Lisbon</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Three family wineries, the Setúbal market, a long Portuguese lunch — all on the cork-oak
              side of the Atlantic, with your own driver and guide.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton
                to="/tours/$tourId"
                params={{ tourId: PARENT_TOUR_ID }}
                variant="primary"
              >
                Explore the Signature
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design & Book
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl prose-yes">
            <div className="mb-14">
              <Eyebrow className="mb-4">Where it actually is</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                The closest serious wine country to Lisbon.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Cross the 25 de Abril Bridge and forty minutes later the road climbs into the
                Arrábida hills. Cork oaks on one side, the Atlantic glinting on the other. At the
                centre is the village of Azeitão — home of Moscatel de Setúbal and small family
                wineries that have been pouring for seven generations. The Setúbal fish market,
                145 years old, is fifteen minutes further down the coast.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What the day looks like</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Three cellars, one long lunch, no rush.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We start at Setúbal's Livramento market — oysters, cheese, the first glass of
                Moscatel — then move between three family wineries in Azeitão, with a long
                traditional lunch in the middle. Optional close at Cristo Rei or Sesimbra Castle for
                Atlantic light at the end of the day. Pickup and drop-off at your Lisbon hotel; the
                driving is on us.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What makes it a YES day</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Private from the start. Real cellars. Designed live.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We are a licensed Portuguese team (RNAAT 31/2023), not a marketplace re-selling
                someone else's bus. Every day is private from the start — your group, your pace,
                your wineries. The cellars we use are ones we have personally worked with, where the
                family still pours. If a winery isn't open the day you want, we change it — the
                Studio shows you the alternative in real time, with price.
              </p>
            </div>

            <div className="mt-4 pt-12 border-t border-[color:var(--gold-soft)]/40">
              <Eyebrow className="mb-4">Pair it with</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
                Other Signature days in Arrábida.
              </h2>
              <ul className="grid sm:grid-cols-3 gap-5 not-prose">
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "azeitao-cheese" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Azeitão Cheese</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">A morning with a 7th-generation cheesemaker.</span>
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "arrabida-boat" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Arrábida by Boat</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Swim the protected coves only reachable by sea.</span>
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "wild-beaches-picnic" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Wild Beaches & Picnic</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Hidden Atlantic coves with a long table picnic.</span>
                  </Link>
                </li>
              </ul>
            </div>

            <aside className="mt-12 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Book this day
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CtaButton to="/experiences" variant="primary">
                  Explore Signature Experiences
                </CtaButton>
                <CtaButton to="/studio-v3" variant="ghost">
                  Design & Book
                </CtaButton>
              </div>
            </aside>
          </div>
        </section>

        <LandingTourCredibility
          parentTourId={PARENT_TOUR_ID}
          headline="What guests say about the Arrábida day"
        />
        <RecognisedByGuides placement="wine-landing" />
      </article>
    </SiteLayout>
  );
}
