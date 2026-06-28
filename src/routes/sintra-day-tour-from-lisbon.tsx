import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, SITE_URL } from "@/lib/jsonld";

const PAGE_PATH = "/sintra-day-tour-from-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "sintra-cascais";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Sintra Day Tour from Lisbon — Private, Hidden Gems & Cabo da Roca";
const DESCRIPTION =
  "Private Sintra day tour from Lisbon — quieter palaces and forests, Cabo da Roca and Cascais, ending with a small wine tasting. Door-to-door from your Lisbon hotel.";

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
  touristType: "Couples · culture lovers · first-timers",
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
    price: 159,
    priceRange: "From €159",
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

export const Route = createFileRoute("/sintra-day-tour-from-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "sintra day tour from lisbon, sintra tour from lisbon, sintra tours from lisbon, sintra private tour, lisbon to sintra day trip, private sintra tour",
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
          { name: "Sintra Day Tour from Lisbon", path: PAGE_PATH },
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
            <Eyebrow flank>Lisbon · Private Sintra Day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Sintra Day Tour from Lisbon —{" "}
              <SectionTitle.Em>without the queues</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Quieter palaces and forest paths, Cabo da Roca and Cascais, finishing with a small
              private wine tasting.
            </p>
            <div className="mt-8">
              <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                See the Sintra & Cascais Signature
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl prose-yes">
            <div className="mb-14">
              <Eyebrow className="mb-4">Why early</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Sintra is the day everyone has heard of.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We prefer it early, before the main estates fill with buses. The Pena Palace sits
                above the treeline; Quinta da Regaleira is a garden of grottoes and symbols. From
                the hill the road runs west to Cabo da Roca, the westernmost point of mainland
                Europe, and drops to Cascais for late afternoon.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What we add</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                A working winery, not just the postcard list.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Most Sintra day tours stop at the palaces and leave. We add a quiet tasting at Adega
                Regional de Colares — vines planted in Atlantic sand — and a lunch break above the
                cliffs at Azenhas do Mar. The mood matters as much as the monuments.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Private vs train</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                The train takes you to the town. We take you to the day.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                The Lisbon-to-Sintra train is fine for a half-day glance. A private day means hotel
                pickup, a single car between Sintra, Cabo da Roca and Cascais, and a licensed local
                guide who decides which estate to skip when the line is long.
              </p>
            </div>

            <aside className="mt-4 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Book this day
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                  Reserve the Sintra & Cascais Signature
                </CtaButton>
                <CtaButton to="/tours/$tourId/tailor" params={{ tourId: PARENT_TOUR_ID }} variant="ghost">
                  Tailor this Signature
                </CtaButton>
              </div>
              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link to="/tours/$tourId" params={{ tourId: "arrabida-wine-allinclusive" }} className="hover:text-[color:var(--teal)] transition-colors">
                    Arrábida Wine →
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
