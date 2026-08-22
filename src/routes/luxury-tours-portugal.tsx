import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd } from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/luxury-tours-portugal";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Luxury Portugal Tours — Private, All-Inclusive, By a Local";
const DESCRIPTION =
  "Understated luxury across Portugal — private car, hand-picked estates, unhurried tables. Designed and hosted by a licensed local team.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: TITLE,
  description: DESCRIPTION,
  url: PAGE_URL,
  inLanguage: "en",
};

export const Route = createFileRoute("/luxury-tours-portugal")({
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
          { name: "Luxury Tours Portugal", path: PAGE_PATH },
        ]),
      ),
    ],
  }),
  component: Page,
});

const PILLARS: {
  eyebrow: string;
  title: string;
  body: string;
  cta: { to: string; tourId?: string; label: string };
}[] = [
  {
    eyebrow: "The definition",
    title: "Luxury, but the honest kind.",
    body: "Luxury here is not a Champagne handshake — it's a private car, a driver who knows the estate owners by name, and a day paced around you. Small details done properly: the right table, the right window at the palace, the winemaker actually there when we arrive.",
    cta: { to: "/experiences", label: "Explore Signature Experiences" },
  },
  {
    eyebrow: "Private wine days",
    title: "Arrábida — the coastal wine region an hour from Lisbon.",
    body: "Cork oaks, cliff-top vineyards, and Moscatel de Setúbal at cellars that don't take walk-ins. All-inclusive: transfers, tastings, lunch on the water, and time to actually sit down.",
    cta: {
      to: "/tours/$tourId",
      tourId: "arrabida-wine-allinclusive",
      label: "See the Arrábida Wine Signature",
    },
  },
  {
    eyebrow: "Private multi-day",
    title: "A ten-day private route across Portugal.",
    body: "Lisbon, Sintra, the Arrábida coast, and two nights in the Alentejo. Everything private — vehicle, guide, and each estate chosen for the day, not booked from a catalogue.",
    cta: {
      to: "/itineraries/10-day-private-portugal-tour",
      label: "See the 10-day private Portugal tour",
    },
  },
  {
    eyebrow: "Occasions",
    title: "Proposals, anniversaries, and quiet celebrations.",
    body: "A cellar to yourselves at sunset, a boat drifting off the Arrábida cliffs, a table set in a vineyard. Designed one-to-one, never a package.",
    cta: { to: "/proposal-in-portugal", label: "See Proposals & Celebrations" },
  },
];

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Portugal · Luxury Private Tours</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Luxury Portugal tours, <SectionTitle.Em>quietly done.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Private, all-inclusive, and paced around you — designed by the operator on the ground.
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
                We're a small, licensed Portuguese tour operator (RNAAT nº 31/2023) designing{" "}
                <strong className="font-medium">luxury private tours in Portugal</strong> for
                travelers who want the country shown properly — not a bus route with a badge on it.
                Every day is private, all-inclusive, and priced with real numbers.
              </p>

              {PILLARS.map((p, i) => (
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
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-ink)] mb-4">
                Also popular
              </span>
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link to="/portugal-tours" className="hover:text-[color:var(--teal)]">
                    Portugal tours →
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
                  <Link to="/multi-day" className="hover:text-[color:var(--teal)]">
                    Multi-day journeys →
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
