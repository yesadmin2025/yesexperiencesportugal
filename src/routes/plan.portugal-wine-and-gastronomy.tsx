import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";
import {
  jsonLdScript,
  breadcrumbLd,
  faqPageLd,
  SITE_URL,
} from "@/lib/jsonld";
import { RelatedExperiencesRail } from "@/components/RelatedExperiencesRail";
import { rankRelatedTours } from "@/lib/related-experiences";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

/**
 * /plan/portugal-wine-and-gastronomy
 *
 * Themed planning pillar for wine + gastronomy travellers. Uses the
 * canonical planning template but frames the trip by interest rather
 * than length or region. Never invents wineries or dishes — all
 * references point at existing Signature days.
 */

const PATH = "/plan/portugal-wine-and-gastronomy";
const URL = `${SITE_URL}${PATH}`;
const TITLE = "Portugal Wine & Gastronomy Trip Planning — Private Journeys";
const DESCRIPTION =
  "A local operator's guide to planning a private wine and gastronomy trip in Portugal — Arrábida, Alentejo, vinho de talha, and the family tables our team eats at.";

const FAQ = [
  {
    q: "Which region has the best wine trip in Portugal?",
    a: "It depends on the taste. The Arrábida (south of Lisbon) is the easiest wine day — small family cellars, coast, one-hour transfers. The Alentejo goes deeper — vinho de talha, marble villages, two or three nights. The Douro is Portugal's most famous wine region but adds a domestic flight or a long transfer.",
  },
  {
    q: "Do you organise vineyard visits at family cellars?",
    a: "Yes — every winery on our Signature days is a family-run cellar we know personally. Private tastings, no coach groups, always a conversation with someone who makes the wine.",
  },
  {
    q: "Can a wine trip work outside harvest season?",
    a: "Yes. Harvest (September–October) is beautiful but busy. Spring cellars are quieter and equally generous; winter tastings often include library vintages the summer visitor never sees.",
  },
];

export const Route = createFileRoute("/plan/portugal-wine-and-gastronomy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Trip planning", path: "/plan" },
          { name: "Wine & gastronomy", path: PATH },
        ]),
      ),
      jsonLdScript(faqPageLd(FAQ)),
    ],
  }),
  component: PillarPage,
});

function PillarPage() {
  const tours = rankRelatedTours(
    {
      region: "Setúbal · Arrábida · Alentejo · Vidigueira",
      styles: ["wine", "gastronomy", "heritage"],
      highlights: ["tasting", "cheese", "livramento"],
    },
    3,
  );
  const stories = ["portugal-wine-tours", "evora-alentejo-wine-tour", "wine-tours-lisbon"]
    .map((slug) => LOCAL_STORIES_ARTICLES.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SiteLayout>
      <header className="pt-32 md:pt-40 pb-14 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Planning pillar · Wine & gastronomy</Eyebrow>
          <h1 className="mt-5 font-display font-bold text-[2rem] md:text-[2.8rem] leading-[1.12] tracking-[-0.01em] text-[color:var(--charcoal)]">
            Planning a Private Portugal Wine &amp; Gastronomy Trip
          </h1>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl mx-auto">
            Portugal is one of the last wine countries where a family cellar is still a family
            table. This is how we plan trips for travellers who choose the country by what's on
            the plate.
          </p>
          <div className="mt-10">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Plan the trip with a designer
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design a private wine day
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </header>

      <section className="reveal py-20 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x max-w-2xl space-y-12">
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              Two regions do most of the work
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              For a first wine trip, the two regions we design most weeks are the Arrábida (south
              of Lisbon — small family cellars, Moscatel de Setúbal, and lunch in Sesimbra
              harbour) and the Alentejo (Évora, marble villages, and the vinho de talha
              tradition — wine still fermented in Roman-style clay amphorae).
            </p>
          </div>
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              The private day is the unit
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              A good wine day in Portugal is two cellars, not four — enough time to actually eat
              lunch, drive slowly, and sit down at each table for more than a photo. Our
              Signature days below are shaped around that pace.
            </p>
          </div>
          <div>
            <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
              Beyond wine — the tables that go with it
            </h2>
            <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">
              Cheese in Azeitão, the fish grills of the Setúbal coast, the black-pork
              gastronomy of the Alentejo. A gastronomy-first Portugal trip weaves at least one
              of these into every day.
            </p>
          </div>
          <div className="pt-4">
            <Link
              to="/plan"
              className="text-[13px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
            >
              ← Back to Trip planning hub
            </Link>
          </div>
        </div>
      </section>

      <RelatedExperiencesRail
        tours={tours}
        stories={stories}
        toursEyebrow="Signature wine & gastronomy days"
        toursTitle={
          <>
            Private days built <SectionTitle.Em>around a table</SectionTitle.Em>
          </>
        }
        background="ivory"
      />

      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Frequently asked</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Planning your <SectionTitle.Em>wine trip</SectionTitle.Em>
          </SectionTitle>
          <dl className="mt-10 space-y-8">
            {FAQ.map((f) => (
              <div key={f.q} className="border-t border-[color:var(--gold-soft)]/40 pt-5">
                <dt className="serif text-[19px] text-[color:var(--charcoal)]">{f.q}</dt>
                <dd className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </SiteLayout>
  );
}
