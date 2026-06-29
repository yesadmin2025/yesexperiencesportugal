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

const PAGE_PATH = "/wine-tours-lisbon";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
// Lead review aggregate from our strongest-reviewed wine signature.
const PARENT_TOUR_ID = "arrabida-wine-allinclusive";
const PARENT_URL = `${SITE_URL}/tours/${PARENT_TOUR_ID}`;
const TITLE = "Wine Tours from Lisbon — Private Days in Arrábida, Setúbal & Alentejo";
const DESCRIPTION =
  "Private wine tours from Lisbon, designed by a licensed local team. Family wineries in Arrábida and Azeitão, full-day Alentejo from Évora, long Portuguese lunches, door-to-door from your hotel.";

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
  touristType: "Wine travellers · couples · small private groups",
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

export const Route = createFileRoute("/wine-tours-lisbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "wine tours lisbon, lisbon wine tours, private wine tour lisbon, arrabida wine tour, azeitao wine tour, setubal wine tour, alentejo wine tour from lisbon, evora wine tour",
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
          { name: "Wine Tours from Lisbon", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: Page,
});

function SignatureCard({
  to,
  eyebrow,
  title,
  blurb,
}: {
  to: string;
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      to="/tours/$tourId"
      params={{ tourId: to }}
      className="group block p-6 bg-[color:var(--sand)]/60 hover:bg-[color:var(--sand)] transition-colors border border-[color:var(--gold-soft)]/30"
    >
      <span className="block font-sans text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--gold-warm)] mb-3">
        {eyebrow}
      </span>
      <span className="block font-display font-semibold text-[1.05rem] md:text-[1.15rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
        {title}
      </span>
      <span className="block text-[14px] text-[color:var(--charcoal-soft)] leading-[1.7]">
        {blurb}
      </span>
      <span className="mt-4 inline-block text-[12px] uppercase tracking-[0.22em] text-[color:var(--teal)] group-hover:text-[color:var(--gold-warm)] transition-colors">
        See the day →
      </span>
    </Link>
  );
}

function Page() {
  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Lisbon · Private Wine Days</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Wine Tours from Lisbon —{" "}
              <SectionTitle.Em>Arrábida, Setúbal & Alentejo</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Three real wine regions within reach of your hotel. Family producers, long
              Portuguese lunches, your own driver and guide.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/experiences" variant="primary">
                Explore Signature Experiences
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
              <Eyebrow className="mb-4">The honest intro</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Three wine regions, all reachable in a day.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                Lisbon sits between two serious wine countries. Forty minutes south across the 25 de
                Abril bridge are the Arrábida hills and Azeitão — Moscatel de Setúbal country, small
                whitewashed family wineries, the Atlantic just below. An hour and a half east lies
                the Alentejo plain, with the walled town of Évora at its centre. We design private
                wine days in both, and we drive you door to door.
              </p>
            </div>

            <div className="mb-14">
              <Eyebrow className="mb-4">What makes YES different</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                Private. Local. Designed live, not booked off a shelf.
              </h2>
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                We are a licensed Portuguese team (RNAAT 31/2023), not a marketplace reselling
                someone else's bus tour. Every day is private from the start: your group, your pace,
                your wineries. We open the wineries we have personally worked with — the cellars
                where the family pours, not a tasting-room queue — and we sit you at a long lunch
                that takes as long as it should.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-[color:var(--sand)]/40">
          <div className="container-x">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <Eyebrow flank className="mb-4">Real Signature wine days</Eyebrow>
              <h2 className="font-display font-semibold text-[1.5rem] md:text-[1.85rem] leading-[1.2] text-[color:var(--charcoal)]">
                Pick a day — or open the Studio and{" "}
                <span className="font-serif italic text-[color:var(--teal)]">design your own</span>.
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              <SignatureCard
                to="arrabida-wine-allinclusive"
                eyebrow="Arrábida · 8 hours"
                title="Arrábida Wine — All Inclusive"
                blurb="Setúbal's 145-year-old market for oysters and Moscatel, three family wineries in Azeitão, traditional Portuguese lunch, panoramic close at Cristo Rei or Sesimbra."
              />
              <SignatureCard
                to="evora-alentejo"
                eyebrow="Alentejo · 11 hours"
                title="Évora & Alentejo Wine"
                blurb="The walled town of Évora — Roman temple, bone chapel — then two Alentejo wineries with a long lunch under the cork oaks, on the way back to Lisbon."
              />
              <SignatureCard
                to="azeitao-cheese"
                eyebrow="Azeitão · half day"
                title="Azeitão Cheese & Wine"
                blurb="A morning with a 7th-generation Azeitão cheesemaker, paired with the local Moscatel — a calm, intimate alternative to a full wine day."
              />
            </div>
            <div className="mt-12 text-center">
              <CtaButton
                to="/tours/$tourId"
                params={{ tourId: PARENT_TOUR_ID }}
                variant="primary"
              >
                See the Arrábida Wine Signature
              </CtaButton>
            </div>
          </div>
        </section>

        <LandingTourCredibility
          parentTourId={PARENT_TOUR_ID}
          headline="What guests say about our wine days"
        />

        <section className="py-20 md:py-24 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl text-center">
            <Eyebrow flank className="mb-4">Ready when you are</Eyebrow>
            <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-6">
              Reserve a Signature, or design your{" "}
              <span className="font-serif italic text-[color:var(--teal)]">own wine day</span>.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/experiences" variant="primary">
                Explore Signature Experiences
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design & Book
              </CtaButton>
            </div>
          </div>
        </section>

        <RecognisedByGuides placement="wine-landing" />
      </article>
    </SiteLayout>
  );
}
