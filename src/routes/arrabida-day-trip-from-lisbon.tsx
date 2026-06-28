import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, SITE_URL, hreflangUsCaLinks, organizationUsCaAudienceLd } from "@/lib/jsonld";

const PAGE_PATH = "/arrabida-day-trip-from-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "arrabida-wine-allinclusive";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Arrábida Day Trip from Lisbon — Private Wine, Beaches & Sesimbra";
const DESCRIPTION =
  "Private Arrábida day trip from Lisbon — Setúbal market, family wineries in Azeitão, a long Portuguese lunch and an optional close at Sesimbra Castle. Door-to-door driving.";

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
  category: "Private day tour",
  touristType: "Couples · friends · wine-curious travellers",
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

export const Route = createFileRoute("/arrabida-day-trip-from-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "arrabida day trip from lisbon, arrabida tour, arrabida from lisbon, setubal day trip, azeitao day trip, sesimbra day trip, private arrabida tour",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(productLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Experiences", path: "/experiences" },
          { name: "Arrábida Day Trip from Lisbon", path: PAGE_PATH },
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
            <Eyebrow flank>Lisbon · Arrábida Day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Arrábida Day Trip from Lisbon —{" "}
              <SectionTitle.Em>wine, hills & sea</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Setúbal market, family wineries in Azeitão, a long Portuguese lunch and an optional
              close above Sesimbra harbour.
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
              <Eyebrow className="mb-4">Where Arrábida is</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                South of the bridge, forty minutes and a different country.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Cross the 25 de Abril Bridge and the road curves through cork and pine into the
                Arrábida Natural Park — limestone mountains dropping straight into turquoise water,
                small unguarded beaches, and the wine village of Azeitão at its centre. It is the
                closest serious wine country to Lisbon, and the most under-the-radar.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">The day itself</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Market, wineries, long lunch, viewpoint.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We open at Setúbal's 145-year-old Livramento market, climb to two or three family
                wineries, and sit down for an unhurried Portuguese lunch in Azeitão. Optional close
                at Cristo Rei for the Lisbon panorama or Sesimbra Castle for Atlantic light.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Better than a group</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                A private car, your own pace.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Group Arrábida tours typically stop at one winery and rush the lunch. Private means
                hotel pickup, your own driver-guide, and the choice of where to linger — an extra
                cellar, a swim at Galápos, or a longer walk on Sesimbra's castle walls.
              </p>
            </div>

            <div className="mt-4 pt-12 border-t border-[color:var(--gold-soft)]/40">
              <Eyebrow className="mb-4">Pair it with</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
                Other Signature days in Arrábida.
              </h2>
              <ul className="grid sm:grid-cols-3 gap-5 not-prose">
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "arrabida-boat" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Arrábida by Boat</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Swim the protected coves only reachable by sea.</span>
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "wild-beaches-picnic" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Wild Beaches & Picnic</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Hidden coves with a long-table Portuguese picnic.</span>
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "azeitao-cheese" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                    <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Azeitão Cheese</span>
                    <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">A morning with a 7th-generation cheesemaker.</span>
                  </Link>
                </li>
              </ul>

              <div className="mt-10 p-6 md:p-8 bg-[color:var(--charcoal)] text-[color:var(--ivory)] text-center">
                <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold)] mb-3">
                  Only on YES
                </span>
                <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.3rem] leading-[1.3] mb-4">
                  The only private-day builder in Portugal that designs your Arrábida day{" "}
                  <span className="font-serif italic text-[color:var(--gold)]">live</span>.
                </h3>
                <p className="text-[14px] text-[color:var(--ivory)]/80 leading-[1.7] mb-5 max-w-md mx-auto">
                  Mix wineries, beaches and a boat hour — route, timing and price update as you go.
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
                  <Link to="/tours/$tourId" params={{ tourId: "arrabida-boat" }} className="hover:text-[color:var(--teal)] transition-colors">
                    Arrábida Boat →
                  </Link>
                </li>
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "wild-beaches-picnic" }} className="hover:text-[color:var(--teal)] transition-colors">
                    Wild Beaches & Picnic →
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
      </article>
    </SiteLayout>
  );
}
