import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  jsonLdScript,
  breadcrumbLd,
  faqPageLd,
  travelDesignerServiceLd,
} from "@/lib/jsonld";
import { TRAVEL_DESIGNER_FAQ } from "@/content/seo-faq";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/portugal-travel-designer";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const TITLE = "Portugal Travel Designer — Private Journeys, Designed Around You";
const DESCRIPTION =
  "A private travel designer for Portugal — multi-day journeys, honeymoons and meaningful occasions, composed around your pace, route and stays.";

// Three FAQs on-page (schema still ships the full set for richer eligibility)
const FAQ_ON_PAGE = TRAVEL_DESIGNER_FAQ.slice(0, 3);

const ITEMS: {
  eyebrow: string;
  title: string;
  body: string;
  cta: { to: string; tourId?: string; label: string };
}[] = [
  {
    eyebrow: "What it is",
    title: "A full Portugal journey, designed as one.",
    body: "Travel Designer is not a single tour. It's the whole journey — route, stays, transfers, private experiences, timing — composed together so each day flows into the next. One operator, one guide network, one plan that flexes as you travel.",
    cta: { to: "/experiences", label: "See Signature days" },
  },
  {
    eyebrow: "A private ten-day route",
    title: "Lisbon, Sintra, Arrábida, Alentejo.",
    body: "The reference journey we design most often: three regions, ten days, one private vehicle and guide. A useful starting shape to lengthen, shorten or reroute — never a template you have to fit into.",
    cta: {
      to: "/itineraries/10-day-private-portugal-tour",
      label: "See the 10-day reference route",
    },
  },
  {
    eyebrow: "Occasions",
    title: "Honeymoons, anniversaries, proposals.",
    body: "Meaningful private occasions designed with discretion — a quiet dinner on a cliff, a boat at sunset, a moment your travel companions won't see coming. Handled inside the journey, not bolted on.",
    cta: { to: "/proposals", label: "See how we plan proposals" },
  },
  {
    eyebrow: "How it starts",
    title: "One short conversation.",
    body: "Tell us the shape you're imagining — how many days, which season, who's travelling, what matters. We come back with a first proposal you can red-pen. The journey is refined with you before travel, and supported locally while you're here.",
    cta: { to: "/contact?intent=multi-day", label: "Write to a designer" },
  },
];

const jsonLd = travelDesignerServiceLd({ path: PAGE_PATH });

export const Route = createFileRoute("/portugal-travel-designer")({
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
          { name: "Portugal Travel Designer", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(faqPageLd(TRAVEL_DESIGNER_FAQ)),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Portugal · Travel Designer</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              A private travel designer{" "}
              <SectionTitle.Em>for your Portugal journey.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Not a single tour — the whole journey, designed around your pace, route and rhythm.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton to="/contact" search={{ intent: "multi-day" }} variant="primary">
                Write to a designer
              </CtaButton>
              <CtaButton to="/itineraries/10-day-private-portugal-tour" variant="ghost">
                See the 10-day reference route
              </CtaButton>
            </div>
          </div>
        </header>

        <section className="reveal py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                A <strong className="font-medium">Travel Designer</strong> composes an entire
                private journey through Portugal — route, stays, transfers, private experiences,
                timing — as one connected file. It's different from booking a single day: the days
                are designed to belong together. We're a licensed Portuguese operator (RNAAT) based
                in Sesimbra, so the guides, cars and trusted partners along the route are ours to
                coordinate.
              </p>

              {ITEMS.map((p, i) => (
                <div key={i} className="mt-16 md:mt-20">
                  <Eyebrow className="mb-4">{p.eyebrow}</Eyebrow>
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {p.title}
                  </h2>
                  <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
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

            {/* FAQ — 3 on-page (schema below ships the full set) */}
            <div className="mt-20 md:mt-24 pt-12 border-t border-[color:var(--gold-soft)]/40">
              <Eyebrow className="mb-4">Questions travellers ask</Eyebrow>
              <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-8">
                Before the first conversation.
              </h2>
              <dl className="space-y-8">
                {FAQ_ON_PAGE.map((f) => (
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
                  <Link to="/private-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Private tours Portugal →
                  </Link>
                </li>
                <li>
                  <Link to="/portugal-wine-tours" className="hover:text-[color:var(--teal)]">
                    Portugal wine tours →
                  </Link>
                </li>
                <li>
                  <Link to="/luxury-tours-portugal" className="hover:text-[color:var(--teal)]">
                    Luxury Portugal tours →
                  </Link>
                </li>
                <li>
                  <Link to="/local-stories" className="hover:text-[color:var(--teal)]">
                    Local Stories →
                  </Link>
                </li>
              </ul>
            </aside>

            <div className="mt-16 text-center">
              <CtaButton to="/contact" search={{ intent: "multi-day" }} variant="primary">
                Start a Travel Designer request
              </CtaButton>
            </div>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
