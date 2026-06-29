import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";
import { jsonLdScript, breadcrumbLd, SITE_URL, hreflangUsCaLinks, organizationUsCaAudienceLd } from "@/lib/jsonld";

const PAGE_PATH = "/evora-private-tour-from-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "evora-alentejo";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Private Évora Tour from Lisbon | Wine, Cork & Heritage";
const DESCRIPTION =
  "Private Évora tour from Lisbon — the Roman Temple, Chapel of Bones, two family wineries and a cork tradition stop, with an unhurried Alentejo lunch.";

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
  touristType: "Couples · culture-curious travellers · wine lovers",
  duration: "PT10H",
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

export const Route = createFileRoute("/evora-private-tour-from-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "private evora tour from lisbon, evora day trip from lisbon, evora private tour, lisbon to evora, chapel of bones tour, evora roman temple tour, full-day evora tour",
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
          { name: "Private Évora Tour from Lisbon", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: EvoraPrivateLanding,
});

function EvoraPrivateLanding() {
  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Lisbon · Évora private day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Private Évora Tour from Lisbon —{" "}
              <SectionTitle.Em>heritage, wine & cork</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Évora's UNESCO centre, two family wineries and a cork tradition
              stop — a private day across Alentejo at the pace of a long lunch.
            </p>
            <div className="mt-8">
              <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                Explore this experience directly
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl prose-yes">
            <div className="mb-14">
              <Eyebrow className="mb-4">Where Évora is</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Ninety minutes south, two thousand years deep.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Évora is a small UNESCO World Heritage city in the heart of
                Alentejo — Roman Temple, cathedral, narrow lanes and the famous
                Chapel of Bones, all walkable in an afternoon. From Lisbon it is
                an easy private drive across cork-oak country.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">The day itself</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Roman temple, two wineries, a cork stop, long lunch.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We walk the old town with a local guide, visit two family
                wineries — one of them with a restaurant — and add a cork
                tradition stop so you see where Portuguese cork actually comes
                from. Lunch is Alentejo-slow, plates shared, wine local.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Why private</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                No coach, no rush, no fixed script.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Hotel pickup, your own driver-guide, your own car. Stay longer
                in the cathedral cloister, skip a winery, add an extra glass —
                the day moves with you, not with thirty strangers.
              </p>
            </div>
          </div>
        </section>

        <RecognisedByGuides
          placement="alentejo"
          heading="Recognised in travel guides for Évora & Alentejo experiences"
          intro="Independent travel guides have ranked, compared and reviewed the Évora private experience YES Experiences Portugal operates from Lisbon. Some third-party articles link to marketplace listings where YES Experiences Portugal appears as the experience provider."
        />

        <section className="py-16 md:py-20 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <Eyebrow className="mb-4">Pair it with</Eyebrow>
            <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
              Other ways into Alentejo.
            </h2>
            <ul className="grid sm:grid-cols-3 gap-5">
              <li>
                <Link to="/alentejo-wine-tour-from-lisbon" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Alentejo Wine Tour</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Same day, framed around wine and cork.</span>
                </Link>
              </li>
              <li>
                <Link to="/studio-v3" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Design your day</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Mix Évora, wine and cork live in the Studio.</span>
                </Link>
              </li>
              <li>
                <Link to="/multi-day" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Travel Designer</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Add Évora to a multi-day Portugal journey.</span>
                </Link>
              </li>
            </ul>

            <aside className="mt-12 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Book this day
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CtaButton to="/tours/$tourId" params={{ tourId: PARENT_TOUR_ID }} variant="primary">
                  Reserve with YES
                </CtaButton>
                <CtaButton to="/tours/$tourId/tailor" params={{ tourId: PARENT_TOUR_ID }} variant="ghost">
                  Tailor this Signature
                </CtaButton>
              </div>
            </aside>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
