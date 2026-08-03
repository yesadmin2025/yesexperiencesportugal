import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd } from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/private-tours-portugal";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Private Portugal Tours from Lisbon — One Family, One Guide";
const DESCRIPTION =
  "Private Portugal tours from Lisbon — Sintra, Arrábida, Alentejo, Comporta. One family, one guide, one car. Instantly confirmed, all-inclusive pricing.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: TITLE,
  description: DESCRIPTION,
  url: PAGE_URL,
  inLanguage: "en",
};

export const Route = createFileRoute("/private-tours-portugal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(jsonLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Private Tours Portugal", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: Page,
});

const ITEMS: {
  eyebrow: string;
  title: string;
  body: string;
  cta: { to: string; tourId?: string; label: string };
}[] = [
  {
    eyebrow: "Why private",
    title: "The difference is the rhythm.",
    body: "Group tours share a clock and a menu. A private day means you choose when to stop, where to eat, and how long to stay. It's not about the car — it's about being able to change the day when the day earns it.",
    cta: { to: "/experiences", label: "See Signature Experiences" },
  },
  {
    eyebrow: "Private day · Sintra",
    title: "Sintra & Cascais, without the queue.",
    body: "Early at Pena, quiet at Regaleira, late light along Cabo da Roca and Cascais. One guide, one car, and a route that flexes when the palaces fill up.",
    cta: {
      to: "/tours/$tourId",
      tourId: "sintra-cascais",
      label: "See the Sintra & Cascais Signature",
    },
  },
  {
    eyebrow: "Private day · Arrábida",
    title: "The private wine day.",
    body: "Two small cellars we've worked with for years, a lunch on the Setúbal waterfront, and an hour on a cliff-side beach if the light is right. Private, all-inclusive.",
    cta: {
      to: "/tours/$tourId",
      tourId: "arrabida-wine-allinclusive",
      label: "See the Arrábida Wine Signature",
    },
  },
  {
    eyebrow: "Private multi-day",
    title: "A private ten-day route across Portugal.",
    body: "Lisbon, Sintra, the Arrábida coast, and the Alentejo — one operator, one vehicle, one guide, one plan that flexes each morning.",
    cta: {
      to: "/itineraries/10-day-private-portugal-tour",
      label: "See the 10-day private Portugal tour",
    },
  },
];

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Portugal · Private Tours</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Private tours in Portugal, <SectionTitle.Em>one family at a time.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              One guide, one car, one day designed around the mood you woke up in.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/experiences" variant="primary">
                Explore Signature Tours
              </CtaButton>
              <CtaButton to="/experience-studio" variant="ghost">
                Design your own
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="reveal py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              <p className="editorial-body">
                Every experience we run is{" "}
                <strong className="font-medium">private by default</strong> — never joined with
                strangers, never bus-scheduled. We're a licensed Portuguese tour operator (RNAAT nº
                31/2023) based in Sesimbra, so the guides, the cars, and the estates are ours, not a
                broker's.
              </p>

              {ITEMS.map((p, i) => (
                <div key={i} className="mt-16 md:mt-20">
                  <Eyebrow className="mb-4">{p.eyebrow}</Eyebrow>
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {p.title}
                  </h2>
                  <p className="editorial-body">{p.body}</p>
                  <div className="mt-7">
                    {p.cta.tourId ? (
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: p.cta.tourId }}
                        className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)] transition-colors"
                      >
                        {p.cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <Link
                        to={p.cta.to}
                        className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)] transition-colors"
                      >
                        {p.cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <aside className="mt-16 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Also popular
              </span>
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link to="/portugal-tours" className="hover:text-[color:var(--teal)]">
                    Portugal tours →
                  </Link>
                </li>
                <li>
                  <Link to="/luxury-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Luxury Portugal tours →
                  </Link>
                </li>
                <li>
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: "portugal-wine-tours" }}
                    className="hover:text-[color:var(--teal)]"
                  >
                    Portugal wine tours →
                  </Link>
                </li>
                <li>
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: "best-day-trips-from-lisbon" }}
                    className="hover:text-[color:var(--teal)]"
                  >
                    Day trips from Lisbon →
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
