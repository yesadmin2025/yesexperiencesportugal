import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, tripItineraryLd, faqPageLd, SITE_URL } from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import ogSocialImg from "@/assets/cat-multiday.jpg";

/**
 * /itineraries/10-day-private-portugal-tour
 *
 * A SAMPLE ten-day shape — not a fixed, bookable package. Every day is
 * drawn from Signature experiences we already run; the actual itinerary,
 * stays, transfers and dinners are composed with a human Travel Designer
 * at /multi-day and only exist once they are written into the guest's
 * travel file. Per brand rules we never fabricate stops, partners,
 * inclusions or prices, and no multi-day price is published here.
 */

const PAGE_PATH = "/itineraries/10-day-private-portugal-tour";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "10-Day Private Portugal Tour | Sample Itinerary by YES";
const DESCRIPTION =
  "A sample 10-day private Portugal itinerary — Lisbon, Sintra, Arrábida coast and Alentejo wine country — composed with a human Travel Designer around real Signature days.";

interface Day {
  span: string;
  eyebrow: string;
  title: string;
  body: string;
  anchor?: { label: string; to: string };
}

const DAYS: Day[] = [
  {
    span: "Days 1–2",
    eyebrow: "Arrival · Lisbon",
    title: "Lisbon at its quieter angles.",
    body: "Land, settle, and let the city arrive slowly. A private neighbourhood walk through Alfama or Príncipe Real, a table your driver-guide actually eats at, and — if the mood is right — a small Fado room away from the tourist rooms. Arrival transfers are arranged with your designer if you want them in the file.",
  },
  {
    span: "Day 3",
    eyebrow: "Sintra · Cabo da Roca",
    title: "Palaces, then the edge of Europe.",
    body: "A private Sintra day paced for photography rather than queues — quieter palaces, a long look at the Atlantic from Cabo da Roca and a return through Cascais. This is our Sintra & Cascais Signature, placed inside the journey.",
    anchor: { label: "See the Sintra Signature", to: "/tours/sintra-cascais" },
  },
  {
    span: "Day 4",
    eyebrow: "Arrábida · Sesimbra",
    title: "The coast most guests never see.",
    body: "South of the river, the Arrábida ridge falls straight into a Mediterranean-blue sea. A morning viewpoint, time on the water or in a hidden cove, and a fresh-fish lunch in the fishing town of Sesimbra.",
    anchor: { label: "See the Arrábida Signature", to: "/tours/arrabida-boat" },
  },
  {
    span: "Day 5",
    eyebrow: "Azeitão · wine & cheese",
    title: "Small producers, generous tables.",
    body: "Family wineries and a cheese producer around Azeitão, at the foot of the Arrábida hills — small pours and longer conversations. Drawn from our Arrábida wine Signature.",
    anchor: { label: "See the Arrábida Wine Signature", to: "/tours/arrabida-wine-allinclusive" },
  },
  {
    span: "Days 6–7",
    eyebrow: "Alentejo · Évora",
    title: "UNESCO Évora and cork country.",
    body: "Overnight into the Alentejo. A private walk of Évora's old town, a working winery in the surrounding countryside and a long Alentejo lunch. Stays are chosen with you during the proposal, never assumed.",
    anchor: { label: "See the Alentejo Signature", to: "/tours/evora-alentejo" },
  },
  {
    span: "Day 8",
    eyebrow: "Alentejo · open day",
    title: "A day for whichever direction the trip has taken.",
    body: "A quiet estate morning, an olive-oil producer, Roman heritage or simply an extra long lunch — the day your designer keeps open on purpose and shapes with you once we know how the first week has felt.",
    anchor: { label: "See the Roman Alentejo Signature", to: "/tours/roman-heritage-alentejo" },
  },
  {
    span: "Day 9",
    eyebrow: "Return · Lisbon",
    title: "Back to the city, unhurried.",
    body: "A scenic route back to Lisbon with one stop along the way, then an afternoon at leisure. If you would like a farewell dinner, your designer books a table once the group and the mood are known — it is an option, not a default.",
  },
  {
    span: "Day 10",
    eyebrow: "Departure",
    title: "Leave on your own timing.",
    body: "A departure transfer can be timed to your flight when it is part of your travel file. If schedules allow, one last coffee at a bakery locals actually use.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Tell us the shape",
    body: "Dates, group, pace, interests and what Portugal should feel like for you. Ten days is a starting shape, not a rule.",
  },
  {
    n: "02",
    title: "A Travel Designer composes it",
    body: "A human designer builds the route around realistic driving times, our own Signature days, stays and local timing — swapping, stretching or removing days as needed.",
  },
  {
    n: "03",
    title: "You receive a travel file",
    body: "A written day-by-day proposal. Only what is stated in that file is included; nothing here is a promise until it is written there.",
  },
];

const FAQ = [
  {
    q: "Is this a fixed 10-day package I can book as shown?",
    a: "No. This page is a sample shape. Every day is drawn from a private Signature experience we already run, but the actual itinerary — order, stays, transfers, dinners — is composed with a human Travel Designer and confirmed in a written travel file.",
  },
  {
    q: "How much does a 10-day private Portugal tour cost?",
    a: "We do not publish a fixed multi-day price because the route, group size, season and stays change it significantly. Each Signature day shows its own private price on its page; the multi-day proposal itemises everything before you commit.",
  },
  {
    q: "Are hotels, transfers and dinners included?",
    a: "Only when they are written into your travel file. Accommodation preferences and wider travel arrangements are discussed during the proposal so nothing is assumed and nothing appears unexpectedly.",
  },
  {
    q: "Can we do fewer or more than ten days?",
    a: "Yes. Ten days is the shape many of our guests settle into for Lisbon, Sintra, the Arrábida coast and the Alentejo, but a designer can compose a shorter or longer journey, or add regions such as the Vicentine coast or Tróia and Comporta.",
  },
  {
    q: "Who actually runs the days?",
    a: "YES Experiences Portugal is a licensed Portuguese private tour operator. The day experiences are ones we operate ourselves with our own driver-guides; anything delivered by a partner is named as such in the travel file.",
  },
];

const tripLd = tripItineraryLd({
  path: PAGE_PATH,
  name: "10-Day Private Portugal Tour — sample itinerary",
  description: DESCRIPTION,
  touristType: "Luxury private travellers · couples · small families",
  days: [
    {
      name: "Lisbon — arrival, quiet neighbourhoods, hidden Fado",
      description:
        "Arrival days in Lisbon at a slow pace: quiet neighbourhoods away from the crowds and, optionally, an intimate Fado evening.",
    },
    {
      name: "Sintra — palaces, Cabo da Roca, Atlantic coast",
      description:
        "Sintra's palaces and forest, then the cliffs of Cabo da Roca and the Atlantic coastline back toward Lisbon.",
      path: "/tours/sintra-cascais",
    },
    {
      name: "Arrábida & Sesimbra — coastal drive, hidden cove, fresh fish lunch",
      description:
        "The Arrábida Natural Park coastal road, a hidden cove and a fresh fish lunch in the fishing town of Sesimbra.",
      path: "/tours/arrabida-boat",
    },
    {
      name: "Azeitão — small family wineries and cheese producers",
      description:
        "Family wineries and cheese producers in Azeitão, at the foot of the Arrábida hills.",
      path: "/tours/arrabida-wine-allinclusive",
    },
    {
      name: "Évora & the Alentejo — UNESCO old town, cork country, long lunch",
      description:
        "The UNESCO old town of Évora, cork and vineyard country, and a long Alentejo lunch.",
      path: "/tours/evora-alentejo",
    },
    {
      name: "Alentejo open day — estate morning, olive oil or Roman heritage",
      description: "A day kept open on purpose and shaped with the Travel Designer once the first week has been felt.",
      path: "/tours/roman-heritage-alentejo",
    },
    {
      name: "Return to Lisbon — scenic route, optional farewell dinner",
      description:
        "A slow return to Lisbon with one stop on the way; a farewell dinner is arranged only if written into the travel file.",
    },
  ],
});

export const Route = createFileRoute("/itineraries/10-day-private-portugal-tour")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Multi-day journeys", path: "/multi-day" },
          { name: "10-day private Portugal tour", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(tripLd),
      jsonLdScript(faqPageLd(FAQ)),
    ],
  }),
  component: Page,
});

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="reveal pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Eyebrow flank>Sample 10-day itinerary</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            A private ten-day <SectionTitle.Em>Portugal</SectionTitle.Em>, composed with you.
          </SectionTitle>
          <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
            Lisbon, Sintra, the Arrábida coast and the Alentejo — stitched into a single, unhurried
            private journey. This is a <strong className="font-medium text-[color:var(--charcoal)]">sample shape</strong>, not
            a fixed package: the actual days are composed with a human Travel Designer and confirmed
            in a written travel file.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <CtaButton to="/multi-day">Work with a travel designer</CtaButton>
            <CtaButton to="/experiences" variant="ghost">
              Browse Signature experiences
            </CtaButton>
          </div>
        </div>
      </section>

      {/* How this works */}
      <section className="reveal py-14 bg-[color:var(--ivory)]">
        <div className="container-x max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow flank>How this works</Eyebrow>
            <SectionTitle as="h2" size="compact" spacing="loose">
              From a sample shape to <SectionTitle.Em>your</SectionTitle.Em> journey.
            </SectionTitle>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.n} className="border-t border-[color:var(--border)] pt-5">
                <div className="text-[12px] uppercase tracking-[0.28em] text-[color:var(--charcoal)]">
                  {s.n}
                </div>
                <h3 className="serif mt-3 text-[1.25rem] leading-tight text-[color:var(--charcoal)]">
                  {s.title}
                </h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Day-by-day */}
      <section className="reveal py-16 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>How ten days usually shape up</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            The <SectionTitle.Em>shape</SectionTitle.Em> of the trip.
          </SectionTitle>
          <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
            Every day here is drawn from a private experience we already run. Nothing is a stock
            package. Your designer swaps, stretches or removes days so the itinerary matches your
            pace, appetites and travelling company — and only what is written into your travel file
            is included.
          </p>

          <ol className="mt-10 space-y-8">
            {DAYS.map((d) => (
              <li key={d.span} className="border-t border-[color:var(--border)] pt-6">
                <div className="text-[12px] tracking-[0.22em] uppercase text-[color:var(--charcoal)]">
                  {d.span} · {d.eyebrow}
                </div>
                <h3 className="serif text-[22px] md:text-[24px] mt-2 leading-snug text-[color:var(--charcoal)]">
                  {d.title}
                </h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">{d.body}</p>
                {d.anchor && (
                  <Link
                    to={d.anchor.to}
                    className="mt-3 inline-flex min-h-[44px] items-center text-[13px] uppercase tracking-[0.22em] text-[color:var(--teal)]"
                  >
                    {d.anchor.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="reveal py-16 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions travellers ask</Eyebrow>
          <SectionTitle as="h2" size="compact" spacing="loose">
            Before you <SectionTitle.Em>write to us</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 divide-y divide-[color:var(--border)]">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="serif text-[1.15rem] leading-snug text-[color:var(--charcoal)]">
                  {f.q}
                </dt>
                <dd className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Positioning + CTA */}
      <section className="reveal py-16 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Luxury, without theatre</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Private, licensed, <SectionTitle.Em>founder-built</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            YES Experiences Portugal is a licensed Portuguese private tour operator. The days above
            are experiences we run ourselves — with our own driver-guides and tables our team eats
            at. No re-sold packages, no invented partners, and no inclusion assumed until it is in
            your travel file.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <CtaButton to="/multi-day">Start composing your journey</CtaButton>
            <CtaButton to="/day-tours" variant="ghost">
              See the day tours behind it
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
