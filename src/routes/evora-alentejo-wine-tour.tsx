import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";
import { jsonLdScript, breadcrumbLd, SITE_URL, hreflangUsCaLinks, organizationUsCaAudienceLd } from "@/lib/jsonld";
import { withAggregateAndReviews } from "@/lib/aggregate-review-schema";
import { LandingTourCredibility } from "@/components/LandingTourCredibility";

const PAGE_PATH = "/evora-alentejo-wine-tour";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "evora-alentejo";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE =
  "Évora & Alentejo Wine Tour | Private Full-Day Experience from Lisbon";
const DESCRIPTION =
  "Explore Évora and Alentejo on a private full-day experience from Lisbon, combining UNESCO heritage, cork traditions, local wines and a flexible route designed by YES Experiences Portugal.";

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
  touristType: "Wine lovers · couples · culture-curious travellers",
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

export const Route = createFileRoute("/evora-alentejo-wine-tour")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "evora alentejo wine tour, evora and alentejo tour, lisbon to evora wine tour, cork and wine tour alentejo, best full-day tours in evora, private evora alentejo experience",
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
          { name: "Évora & Alentejo Wine Tour", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: EvoraAlentejoLanding,
});

function EvoraAlentejoLanding() {
  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Lisbon · Évora & Alentejo</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Évora & Alentejo Wine Tour —{" "}
              <SectionTitle.Em>one private full day</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              UNESCO heritage, cork traditions, local wines and a route designed
              around you — from Lisbon, for one day, at your pace.
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
              <Eyebrow className="mb-4">The region</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Évora and Alentejo, in one day from Lisbon.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Évora is the UNESCO-listed capital of Alentejo — Roman Temple,
                Chapel of Bones, narrow lanes. Around it stretches cork-oak
                country and some of Portugal's most honest family wineries.
                Done privately, the two fit comfortably into a single full day.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What the day includes</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Cork, wine, heritage, lunch.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                A cork tradition stop, two family wineries, a walk through
                Évora's old town with the Roman Temple and Chapel of Bones, and
                a long Alentejo lunch. The route flexes — fewer stops, deeper
                ones, or the opposite, depending on what you want.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Trust</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Reviewed across independent travel guides.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                The Évora &amp; Alentejo wine experience YES Experiences
                Portugal operates has been compared, ranked and reviewed by
                independent travel guides covering full-day tours from Lisbon —
                see a selection below.
              </p>
            </div>
          </div>
        </section>

        <RecognisedByGuides
          placement="alentejo"
          limit={4}
          heading="Recognised in travel guides for Évora & Alentejo experiences"
          intro="The Évora & Alentejo wine experience YES Experiences Portugal operates has been mentioned across independent travel guides and tour review sites covering private Évora and Alentejo experiences from Lisbon, including wine, cork traditions and UNESCO heritage routes. Some third-party articles link to marketplace listings where YES Experiences Portugal appears as the experience provider."
        />

        <section className="py-16 md:py-20 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <Eyebrow className="mb-4">Keep exploring</Eyebrow>
            <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
              Adjacent ways in.
            </h2>
            <ul className="grid sm:grid-cols-3 gap-5">
              <li>
                <Link to="/evora-private-tour-from-lisbon" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Private Évora Tour</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Framed around heritage and old town.</span>
                </Link>
              </li>
              <li>
                <Link to="/alentejo-wine-tour-from-lisbon" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Alentejo Wine Tour</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Same day, framed around wine and cork.</span>
                </Link>
              </li>
              <li>
                <Link to="/local-stories" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Local Stories</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Why Alentejo is Portugal's most underrated wine region.</span>
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
                <CtaButton to="/studio-v3" variant="ghost">
                  Design your Alentejo day
                </CtaButton>
              </div>
            </aside>
          </div>
        </section>
        <LandingTourCredibility parentTourId={PARENT_TOUR_ID} />
      </article>
    </SiteLayout>
  );
}
