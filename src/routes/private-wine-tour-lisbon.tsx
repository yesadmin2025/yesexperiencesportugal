import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, SITE_URL, hreflangUsCaLinks, organizationUsCaAudienceLd } from "@/lib/jsonld";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";

const PAGE_PATH = "/private-wine-tour-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "arrabida-wine-allinclusive";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Private Wine Tour from Lisbon — Arrábida, Azeitão & Setúbal";
const DESCRIPTION =
  "Private wine tour from Lisbon to Arrábida and Azeitão — two or three family wineries, a long Portuguese lunch and door-to-door driving, designed by a licensed local team.";

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

export const Route = createFileRoute("/private-wine-tour-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "private wine tour lisbon, lisbon wine tour, wine tour lisbon, arrabida wine tour, azeitao wine tour, setubal wine tour, private wine tour from lisbon",
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
      jsonLdScript(productLd),
      jsonLdScript(organizationUsCaAudienceLd()),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Experiences", path: "/experiences" },
          { name: "Private Wine Tour from Lisbon", path: PAGE_PATH },
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
            <Eyebrow flank>Lisbon · Private Wine Day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Private Wine Tour from Lisbon —{" "}
              <SectionTitle.Em>Arrábida & Azeitão</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Two or three family wineries, a long Portuguese lunch and a panoramic close — handled
              door to door from Lisbon.
            </p>
            <div className="mt-8">
              <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                See the Arrábida Wine Signature
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl prose-yes">
            <div className="mb-14">
              <Eyebrow className="mb-4">Why Arrábida</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                The closest serious wine country to Lisbon.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Cross the 25 de Abril Bridge and within forty minutes the road climbs into the
                Arrábida hills. Cork oaks, low whitewashed wineries, and the Atlantic glinting
                below. Azeitão is the village at the centre — home to Moscatel de Setúbal and small
                family producers who have been pouring for seven generations.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What the day feels like</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Two or three wineries, one long lunch, no rush.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We start with Setúbal's 145-year-old Livramento market — oysters, cheese, the first
                glass of Moscatel — then move between family wineries with a long traditional lunch
                in Azeitão in the middle. Optional close at Cristo Rei or Sesimbra Castle for
                Atlantic light. Pickup and drop-off at your Lisbon hotel; the driving is on us.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Private vs group</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Your own pace, your own pours.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Group wine tours run on a fixed clock and a fixed cellar list. A private day means
                you choose how long to linger at each table, which wineries to add, and whether to
                end the day on a viewpoint or back in the city for dinner.
              </p>
            </div>

            <div className="mt-4 pt-12 border-t border-[color:var(--gold-soft)]/40">
              <Eyebrow className="mb-4">Pair it with</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
                Other Signature days in the same region.
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

              <div className="mt-10 p-6 md:p-8 bg-[color:var(--charcoal)] text-[color:var(--ivory)] text-center">
                <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold)] mb-3">
                  Only on YES
                </span>
                <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.3rem] leading-[1.3] mb-4">
                  The only private-day builder in Portugal that designs your wine day{" "}
                  <span className="font-serif italic text-[color:var(--gold)]">live</span>.
                </h3>
                <p className="text-[14px] text-[color:var(--ivory)]/80 leading-[1.7] mb-5 max-w-md mx-auto">
                  Pick the wineries, the lunch, the close — route, timing and price update as you go.
                </p>
                <CtaButton to="/studio-v3" variant="primary">
                  Open the Studio
                </CtaButton>
              </div>

            </div>

            <aside className="mt-12 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Book this day
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                  Reserve the Arrábida Wine Signature
                </CtaButton>
                <CtaButton to="/tours/$tourId/tailor" params={{ tourId: PARENT_TOUR_ID }} variant="ghost">
                  Tailor this Signature
                </CtaButton>
              </div>
              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "azeitao-cheese" }} className="hover:text-[color:var(--teal)] transition-colors">
                    Azeitão Cheese →
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "arrabida-boat" }} className="hover:text-[color:var(--teal)] transition-colors">
                    Arrábida Boat →
                  </Link>
                </li>
                <li>
                  <Link to="/day-trips-from-lisbon" className="hover:text-[color:var(--teal)] transition-colors">
                    All Day Trips →
                  </Link>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <RecognisedByGuides placement="wine-landing" />
      </article>
    </SiteLayout>
  );
}
