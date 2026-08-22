import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd } from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/portugal-tours";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Portugal Tours — Private Days & Multi-Day Journeys | YES";
const DESCRIPTION =
  "Private Portugal tours by a local operator — Lisbon, Sintra, Arrábida, Alentejo, Douro. Signature day tours and multi-day journeys, instantly confirmed.";

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: TITLE,
  headline: "Portugal Tours — Private & Luxury, Designed by a Local Operator",
  description: DESCRIPTION,
  mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
  url: PAGE_URL,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: "YES Experiences Portugal",
    url: BASE_URL,
    logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.ico` },
  },
};

export const Route = createFileRoute("/portugal-tours")({
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
      jsonLdScript(articleJsonLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Portugal Tours", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: Page,
});

const REGIONS: {
  eyebrow: string;
  title: string;
  body: string;
  cta: { to: string; label: string; params?: Record<string, string> };
}[] = [
  {
    eyebrow: "Lisbon & Sintra",
    title: "The classic first day — palaces, forest, and the coast road.",
    body: "Pena Palace above the treeline, Quinta da Regaleira's grottoes, then Cabo da Roca and Cascais in the late light. A full private day, paced so you skip the buses and eat where locals eat.",
    cta: {
      to: "/tours/$tourId",
      label: "See the Sintra & Cascais Signature",
      params: { tourId: "sintra-cascais" },
    },
  },
  {
    eyebrow: "Arrábida & Setúbal",
    title: "South of the bridge — wine country and Atlantic beaches.",
    body: "Cork forests drop into blue coves, Setúbal grills the day's fish on the promenade, and small cellars pour Moscatel de Setúbal. Our home region — a slower Portugal, an hour from Lisbon.",
    cta: {
      to: "/tours/$tourId",
      label: "See the Arrábida Wine Signature",
      params: { tourId: "arrabida-wine-allinclusive" },
    },
  },
  {
    eyebrow: "Alentejo & Évora",
    title: "Roman walls, cork oaks, and long lunches.",
    body: "Évora's medieval centre, whitewashed villages, and estates that pour reserva wines under old olive trees. The Alentejo rewards a slower rhythm — two nights minimum for the ones who fall in love with it.",
    cta: {
      to: "/tours/$tourId",
      label: "See the Évora & Alentejo Signature",
      params: { tourId: "evora-alentejo" },
    },
  },
  {
    eyebrow: "Tróia & Comporta",
    title: "The quiet luxury coast.",
    body: "Rice paddies, pine forest, and a peninsula of empty white-sand beaches. Comporta is the Portugal that hides in plain sight — arrived at by ferry, lived at walking pace.",
    cta: {
      to: "/tours/$tourId",
      label: "See the Tróia & Comporta Signature",
      params: { tourId: "troia-comporta" },
    },
  },
  {
    eyebrow: "10 days · Multi-day",
    title: "A private route from Lisbon through Sintra to the Alentejo.",
    body: "For guests who want the whole picture: coast, wine country, historic cities, and time to breathe. Fully private, designed around the pace you keep on holiday.",
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
              Portugal tours,{" "}
              <SectionTitle.Em>shown the way a local shows a friend.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Private, paced, and designed by the operator on the ground — not a reseller in another
              country.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/experiences" variant="primary">
                Explore Signature Tours
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design your own
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="reveal py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              <p className="editorial-body">
                Portugal is small enough to see in a week, and layered enough to spend a month on.
                We're a licensed Portuguese tour operator (RNAAT nº 31/2023) based in Sesimbra,
                designing <strong className="font-medium">private Portugal tours</strong> for
                travelers who want a real day, not a bus route. Every trip below is a real Signature
                — run by us, priced with everything included, and confirmed in minutes.
              </p>

              {REGIONS.map((r, i) => (
                <div key={i} className="mt-16 md:mt-20">
                  <Eyebrow className="mb-4">{r.eyebrow}</Eyebrow>
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {r.title}
                  </h2>
                  <p className="editorial-body">{r.body}</p>
                  <div className="mt-7">
                    {r.cta.params ? (
                      <Link
                        to={r.cta.to as "/tours/$tourId"}
                        params={r.cta.params as { tourId: string }}
                        className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)] transition-colors"
                      >
                        {r.cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <Link
                        to={r.cta.to}
                        className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)] transition-colors"
                      >
                        {r.cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <aside className="mt-16 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-ink)] mb-4">
                Also popular
              </span>
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link to="/portugal-travel-designer" className="hover:text-[color:var(--teal)]">
                    Design a private Portugal journey →
                  </Link>
                </li>
                <li>
                  <Link to="/multi-day" className="hover:text-[color:var(--teal)]">
                    Explore multi-day Portugal →
                  </Link>
                </li>
                <li>
                  <Link to="/luxury-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Luxury Portugal tours →
                  </Link>
                </li>
                <li>
                  <Link to="/private-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Private Portugal tours →
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
