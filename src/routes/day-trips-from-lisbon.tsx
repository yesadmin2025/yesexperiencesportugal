import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd } from "@/lib/jsonld";

const BASE_URL = "https://yesexperiencesportugal.com";
const PAGE_PATH = "/day-trips-from-lisbon";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Best Day Trips from Lisbon — by a Local",
  name: "Best Day Trips from Lisbon (by a Local) — Wine, Coast & Arrábida",
  description:
    "A local's guide to the best day trips from Lisbon — Arrábida wine country, the wild south coast, Sintra and Sesimbra. Written by the team that designs them.",
  mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
  url: PAGE_URL,
  datePublished: "2026-06-27",
  dateModified: "2026-06-27",
  inLanguage: "en",
  author: {
    "@type": "Organization",
    name: "YES Experiences Portugal",
    url: BASE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "YES Experiences Portugal",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/favicon.ico`,
    },
  },
};

export const Route = createFileRoute("/day-trips-from-lisbon")({
  head: () => ({
    meta: [
      { title: "Best Day Trips from Lisbon (by a Local) — Wine, Coast & Arrábida" },
      {
        name: "description",
        content:
          "A local's guide to the best day trips from Lisbon — Arrábida wine country, the wild south coast, Sintra and Sesimbra. Written by the team that designs them.",
      },
      {
        property: "og:title",
        content: "Best Day Trips from Lisbon (by a Local) — Wine, Coast & Arrábida",
      },
      {
        property: "og:description",
        content:
          "A local's guide to the best day trips from Lisbon — Arrábida wine country, the wild south coast, Sintra and Sesimbra.",
      },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "article" },
      { property: "article:published_time", content: "2026-06-27" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(articleJsonLd),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Best Day Trips from Lisbon", path: PAGE_PATH },
        ]),
      ),
    ],
  }),

  component: Page,
});

const sections: { id: string; eyebrow: string; title: string; body: string; cta?: { to: string; label: string; tourId: string } }[] = [
  {
    id: "intro",
    eyebrow: "Why leave",
    title: "Lisbon sits on a wide estuary, with very different landscapes within an hour.",
    body: `South, the Arrábida hills drop into the Atlantic. West, Sintra rises green and misty. The coast road to Cascais catches the evening light. Each direction is a short drive, but the mood changes completely. The right day trip depends on what you want to feel by lunchtime — palace gardens, wine country, or a wild beach with no plans.`,
  },
  {
    id: "arrabida",
    eyebrow: "Arrábida & Setúbal",
    title: "South of the bridge, the city loosens.",
    body: `Cross the 25 de Abril Bridge and the road curves through cork and pine to the Arrábida Natural Park. The mountains meet a string of small, unguarded beaches. Setúbal is a working fishing city with a calm waterfront, grilled fish on the promenade, and the small cellars that make Moscatel de Setúbal. It is a slower day, built around wine, fish, and long views.`,
    cta: {
      to: "/tours/$tourId",
      label: "See the Arrábida Wine Signature",
      tourId: "arrabida-wine-allinclusive",
    },
  },
  {
    id: "sintra",
    eyebrow: "Sintra & Cascais",
    title: "The palace-and-forest day, done early.",
    body: `Sintra is the day everyone has heard of. We prefer it early, before the main estates fill with buses. The Pena Palace sits above the treeline, the Quinta da Regaleira is a garden of grottoes and symbols, and the road west passes Cabo da Roca, Europe's westernmost point, before dropping to Cascais for late afternoon.`,
    cta: {
      to: "/tours/$tourId",
      label: "See the Sintra & Cascais Signature",
      tourId: "sintra-cascais",
    },
  },
  {
    id: "wild-beaches",
    eyebrow: "Wild beaches",
    title: "A picnic, a cove, and nowhere to be.",
    body: `For guests who want to move less and feel more, we head to the beaches below the Arrábida ridge. The water is cold, the cliffs are warm, and a long picnic turns the day into something quieter. It is the choice when the goal is to escape the city rather than tick off sights.`,
    cta: {
      to: "/tours/$tourId",
      label: "See the Wild Beaches Signature",
      tourId: "wild-beaches-picnic",
    },
  },
  {
    id: "choose",
    eyebrow: "How to choose",
    title: "Pick the mood, not the itinerary.",
    body: `If palaces, forest, and a coastal road sound right, choose Sintra. If wine, fish, and a wild coastline sound right, choose Arrábida. If you want to do almost nothing in a beautiful place, choose the beach picnic. All three are within 90 minutes of Lisbon, and each can stand alone as a full day.`,
  },
  {
    id: "private",
    eyebrow: "Private vs group",
    title: "The difference is in the rhythm.",
    body: `Group tours cover the same ground, but they run on a fixed clock and a fixed menu. A private day means you choose when to stop, where to eat, and how long to stay. The route can flex — add a cellar, skip the busiest palace, or spend an hour on a beach you did not plan to find. That flexibility is what turns a day trip into a personal experience.`,
  },
];

function Page() {
  return (
    <SiteLayout>
      <article>
        {/* Hero */}
        <header className="pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Lisbon · Day Trips</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Best Day Trips from Lisbon —{" "}
              <SectionTitle.Em>by a Local</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
              Where we actually take friends when they visit — and which trips are worth the drive.
            </p>
          </div>
        </header>

        {/* Body */}
        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              {sections.map((s) => (
                <div key={s.id} id={s.id} className="mb-16 md:mb-20 scroll-mt-24">
                  <Eyebrow className="mb-4">{s.eyebrow}</Eyebrow>
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {s.title}
                  </h2>
                  <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                    {s.body}
                  </p>
                  {s.cta && (
                    <div className="mt-7">
                      <Link
                        to={s.cta.to as "/tours/$tourId"}
                        params={{ tourId: s.cta.tourId }}
                        className="inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-[color:var(--teal)] hover:text-[color:var(--teal-2)] transition-colors"
                      >
                        {s.cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA band */}
            <aside className="mt-8 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Travel this guide
              </span>
              <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-8 max-w-xl mx-auto leading-[1.75]">
                These days already live inside our Signature collection — private, paced, and shaped to you. Or build
                your own route from scratch in the Experience Studio.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CtaButton to="/experiences" variant="primary">
                  Explore Signature Experiences
                </CtaButton>
                <CtaButton to="/studio-v3" variant="ghost">
                  Design From Scratch
                </CtaButton>
              </div>

              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <li>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: "arrabida-wine-allinclusive" }}
                    className="hover:text-[color:var(--teal)] transition-colors"
                  >
                    Arrábida Wine →
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: "sintra-cascais" }}
                    className="hover:text-[color:var(--teal)] transition-colors"
                  >
                    Sintra & Cascais →
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: "wild-beaches-picnic" }}
                    className="hover:text-[color:var(--teal)] transition-colors"
                  >
                    Wild Beaches & Picnic →
                  </Link>
                </li>
              </ul>
            </aside>

            <nav className="mt-16 text-center">
              <Link
                to="/local-stories"
                className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)] transition-colors"
              >
                ← Back to Local Stories
              </Link>
            </nav>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
