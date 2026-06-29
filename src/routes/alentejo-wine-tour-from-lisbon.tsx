import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";
import { jsonLdScript, breadcrumbLd, SITE_URL, hreflangUsCaLinks, organizationUsCaAudienceLd } from "@/lib/jsonld";

const PAGE_PATH = "/alentejo-wine-tour-from-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PARENT_TOUR_ID = "evora-alentejo";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Alentejo Wine Tour from Lisbon | Private Évora & Cork Experience";
const DESCRIPTION =
  "Private Alentejo wine tour from Lisbon — Évora's UNESCO old town, two family wineries and a cork tradition stop, with a long Alentejo lunch. Door-to-door driving.";

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

export const Route = createFileRoute("/alentejo-wine-tour-from-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "alentejo wine tour from lisbon, alentejo wine tour, evora wine tour, lisbon to evora wine tour, cork and wine tour alentejo, private alentejo tour",
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
          { name: "Alentejo Wine Tour from Lisbon", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: AlentejoWineLanding,
});

function AlentejoWineLanding() {
  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Lisbon · Alentejo wine country</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Alentejo Wine Tour from Lisbon —{" "}
              <SectionTitle.Em>wine, cork & Évora</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Two family wineries, a cork tradition stop and Évora's UNESCO old
              town — at the unhurried pace of Alentejo.
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
              <Eyebrow className="mb-4">Why Alentejo</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Portugal's most underrated wine region — and the slowest.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Alentejo is plains, cork oaks and family-run wineries that still
                make wine the way their grandparents did. It is also where most
                of the world's cork is born. From Lisbon it is a long day, not a
                short one — which is exactly why it stays quiet.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">The day itself</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Cork, two wineries, Évora old town, long lunch.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We open with a cork tradition stop, taste at two family wineries
                — one with restaurant, one with cellars — and walk Évora's
                cobbled centre past the Roman Temple and the Chapel of Bones.
                Lunch is unhurried, somewhere local, somewhere honest.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">Private, not group</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Your driver-guide, your pace.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Hotel pickup in Lisbon, a comfortable car, and the freedom to
                linger an extra glass at a cellar you like or skip a stop you
                don't. The route is built around you — not a coach schedule.
              </p>
            </div>
          </div>
        </section>

        <RecognisedByGuides
          placement="alentejo"
          heading="Recognised in travel guides for Évora & Alentejo experiences"
          intro="The Évora & Alentejo wine experience YES Experiences Portugal operates has been compared, ranked and reviewed across independent travel guides covering full-day tours from Lisbon. Some third-party articles link to marketplace listings where YES Experiences Portugal appears as the experience provider."
        />

        <section className="py-16 md:py-20 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <Eyebrow className="mb-4">Other ways in</Eyebrow>
            <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
              Pair Alentejo with the rest of Portugal.
            </h2>
            <ul className="grid sm:grid-cols-3 gap-5">
              <li>
                <Link to="/tours/$tourId" params={{ tourId: "roman-heritage-alentejo" }} className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Hidden Roman Alentejo</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Talha (clay-pot) wine with a family who still makes it.</span>
                </Link>
              </li>
              <li>
                <Link to="/studio-v3" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Design your Alentejo day</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Mix wineries, cork and Évora live in the Studio.</span>
                </Link>
              </li>
              <li>
                <Link to="/multi-day" className="block p-5 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors">
                  <span className="block font-display font-semibold text-[15px] text-[color:var(--charcoal)] mb-1">Travel Designer</span>
                  <span className="block text-[13px] text-[color:var(--charcoal-soft)] leading-[1.55]">Add Alentejo to a multi-day Portugal journey.</span>
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
