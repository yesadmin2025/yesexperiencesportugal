import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, faqPageLd } from "@/lib/jsonld";
import { WINE_TOURS_FAQ } from "@/content/seo-faq";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/portugal-wine-tours";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Portugal Wine Tours — Arrábida, Setúbal & Alentejo | YES";
const DESCRIPTION =
  "Private Portugal wine tours — Arrábida, Setúbal, Azeitão and Alentejo. Real cellars, real winemakers, all-inclusive private days from Lisbon.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: TITLE,
  description: DESCRIPTION,
  url: PAGE_URL,
  inLanguage: "en",
};

export const Route = createFileRoute("/portugal-wine-tours")({
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
          { name: "Portugal Wine Tours", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(faqPageLd(WINE_TOURS_FAQ)),
    ],
  }),
  component: Page,
});

const REGIONS: {
  eyebrow: string;
  title: string;
  body: string;
  cta: { to: string; tourId?: string; label: string };
}[] = [
  {
    eyebrow: "Arrábida & Setúbal",
    title: "The wine coast an hour from Lisbon.",
    body: "Moscatel de Setúbal, Castelão reds, and cellars perched between cork forest and Atlantic cliffs. Our home region — a private day here is what we do best.",
    cta: {
      to: "/tours/$tourId",
      tourId: "arrabida-wine-allinclusive",
      label: "See the Arrábida Wine Signature",
    },
  },
  {
    eyebrow: "Azeitão",
    title: "A quieter cellar day — cheese, wine, and no queue.",
    body: "Azeitão's small artisan cheesemakers, a working family cellar, and a lunch table under grapevines. Slower, closer, and often the guest favourite.",
    cta: {
      to: "/tours/$tourId",
      tourId: "azeitao-cheese",
      label: "See the Azeitão Cheese & Wine Signature",
    },
  },
  {
    eyebrow: "Alentejo",
    title: "Reserva reds under old olive trees.",
    body: "Two hours south, the Alentejo pours the country's most concentrated reds. Estates that don't take walk-ins, long lunches, and an afternoon in Évora on the way back.",
    cta: {
      to: "/tours/$tourId",
      tourId: "evora-alentejo",
      label: "See the Évora & Alentejo Signature",
    },
  },
  {
    eyebrow: "Private wine day from Lisbon",
    title: "One private car, one guide, one great cellar day.",
    body: "All-inclusive: transfers from your Lisbon hotel, tastings, lunch, and the guide who knows which cellar is pouring well this month.",
    cta: { to: "/private-wine-tour-lisbon", label: "See private wine tours from Lisbon" },
  },
];

function Page() {
  return (
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Portugal · Wine Tours</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Portugal wine tours, <SectionTitle.Em>poured properly.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Small cellars, real winemakers, and a private day paced around lunch.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/experiences" variant="primary">
                Explore Wine Experiences
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
                Portugal is a wine country before it's a beach country. Our{" "}
                <strong className="font-medium">private wine tours</strong> stay off the coach
                circuit — small cellars, working winemakers, and the kind of lunch that turns a
                tasting into a proper day.
              </p>

              {REGIONS.map((p, i) => (
                <div key={i} className="mt-16 md:mt-20">
                  <Eyebrow className="mb-4">{p.eyebrow}</Eyebrow>
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {p.title}
                  </h2>
                  <p className="editorial-body">
                    {p.body}
                  </p>
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

            <div className="mt-20 md:mt-24 pt-12 border-t border-[color:var(--gold-soft)]/40">
              <Eyebrow className="mb-4">Questions travellers ask</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-8">
                Before you pour the first glass.
              </h2>
              <dl className="space-y-8">
                {WINE_TOURS_FAQ.map((f) => (
                  <div key={f.q}>
                    <dt className="font-display font-semibold text-[1.05rem] md:text-[1.15rem] text-[color:var(--charcoal)] mb-3">
                      {f.q}
                    </dt>
                    <dd className="text-[15px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.75]">
                      {f.a}
                    </dd>
                  </div>
                ))}
              </dl>
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
                  <Link to="/private-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Private Portugal tours →
                  </Link>
                </li>
                <li>
                  <Link to="/wine-tours-lisbon" className="hover:text-[color:var(--teal)]">
                    Wine tours from Lisbon →
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
