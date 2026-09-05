import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  jsonLdScript,
  breadcrumbLd,
  tripItineraryLd,
  faqPageLd,
  SITE_URL,
} from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import ogSocialImg from "@/assets/cat-multiday.jpg";

/**
 * /itineraries/10-day-private-portugal-tour
 *
 * Editorial Travel Designer sample, not a fixed or instantly bookable package.
 * The day shapes below are grounded in regions and Signature experiences the
 * business already operates. The final journey is human-composed after enquiry.
 */

const PAGE_PATH = "/itineraries/10-day-private-portugal-tour";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "10-Day Private Portugal Tour | Luxury Itinerary by YES";
const DESCRIPTION =
  "A private 10-day Portugal itinerary shaped with a human travel designer — Lisbon, Sintra, Arrábida and the Alentejo, connected at your pace.";

const FAQS = [
  {
    q: "Is this a fixed 10-day Portugal package?",
    a: "No. This page shows the shape a ten-day private journey can take using regions and experiences YES already operates. Your final route is composed with a human Travel Designer around your dates, pace, interests and travelling party.",
  },
  {
    q: "Can the route or number of days change?",
    a: "Yes. Ten days is an example, not a requirement. Days can be removed, extended or reordered, and the balance between Lisbon, Sintra, the Arrábida coast and the Alentejo is refined with you before confirmation.",
  },
  {
    q: "Do I book this itinerary instantly online?",
    a: "No. Multi-day Travel Designer journeys are human-crafted proposals. You first share your dates and priorities, then receive a curated journey to review and refine before booking.",
  },
  {
    q: "Can I see the day experiences before requesting a proposal?",
    a: "Yes. Several chapters link to the matching Signature experiences, so you can see the real day-tour foundations before asking the Travel Designer to connect them into a longer journey.",
  },
];

const tripLd = tripItineraryLd({
  path: PAGE_PATH,
  name: "10-Day Private Portugal Tour",
  description: DESCRIPTION,
  touristType: "Private travellers · couples · families · small groups",
  days: [
    {
      name: "Lisbon — arrival and city rhythm",
      description:
        "Begin in Lisbon and let the first days establish the pace before moving into the surrounding regions.",
    },
    {
      name: "Sintra & Cascais — palaces, forest and Atlantic coast",
      description:
        "A private Sintra and Cascais day grounded in the existing YES Signature experience.",
      path: "/tours/sintra-cascais",
    },
    {
      name: "Arrábida & Sesimbra — coast and fishing-town context",
      description:
        "A private day south of Lisbon through Arrábida and Sesimbra, shaped from existing YES coastal experiences.",
      path: "/tours/arrabida-boat",
    },
    {
      name: "Azeitão — wine, food and local craft",
      description:
        "A private Azeitão chapter drawing on the wine and food experiences YES already runs in the region.",
      path: "/tours/arrabida-wine-allinclusive",
    },
    {
      name: "Évora & the Alentejo — heritage and wine country",
      description:
        "A private Alentejo chapter centred on Évora and the surrounding wine country.",
      path: "/tours/evora-alentejo",
    },
    {
      name: "Return to Lisbon — journey closes at your pace",
      description:
        "The final chapter is shaped around the confirmed route, travel logistics and the pace agreed with your Travel Designer.",
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
          { name: "Itineraries", path: PAGE_PATH },
          { name: "10-day private Portugal tour", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(tripLd),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: Page,
});

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
    title: "Let Lisbon set the pace.",
    body: "The first chapter is deliberately light. Your designer uses it to balance arrival time, the neighbourhood you are staying in and how much structure you actually want before the route moves beyond the city.",
  },
  {
    span: "Day 3",
    eyebrow: "Sintra · Cascais",
    title: "A private Sintra day, then the Atlantic.",
    body: "This chapter draws from the real Sintra & Cascais Signature: palace and landscape choices are balanced with the coast so the day feels coherent rather than like a checklist.",
    anchor: { label: "See the Sintra Signature", to: "/tours/sintra-cascais" },
  },
  {
    span: "Day 4",
    eyebrow: "Arrábida · Sesimbra",
    title: "Cross the river into a different Portugal.",
    body: "Arrábida and Sesimbra bring the route into the coast south of Lisbon. The exact mix of viewpoints, sea and local context is chosen from experiences YES already operates in the region.",
    anchor: { label: "See an Arrábida Signature", to: "/tours/arrabida-boat" },
  },
  {
    span: "Day 5",
    eyebrow: "Azeitão · wine & food",
    title: "Give the region a slower, food-led chapter.",
    body: "Azeitão adds wine, local food and craft without turning the journey into a tasting marathon. Your Travel Designer can lean this day more toward wine, food or the surrounding villages depending on the group.",
    anchor: { label: "See the Arrábida Wine Signature", to: "/tours/arrabida-wine-allinclusive" },
  },
  {
    span: "Days 6–7",
    eyebrow: "Alentejo · Évora",
    title: "Move inland for heritage and wine country.",
    body: "Évora and the Alentejo create the natural longer chapter of the sample route. The final proposal determines how much time stays in the historic city and how much moves into the surrounding countryside.",
    anchor: { label: "See the Alentejo Signature", to: "/tours/evora-alentejo" },
  },
  {
    span: "Day 8",
    eyebrow: "Alentejo · breathing room",
    title: "Keep one day deliberately flexible.",
    body: "A multi-day private journey works better when every hour is not pre-filled. This is the chapter the designer uses for a slower morning, a longer meal or an approved local experience that fits the final brief and availability.",
  },
  {
    span: "Day 9",
    eyebrow: "Return · Lisbon",
    title: "Return without turning it into a transfer day.",
    body: "The return is composed around the confirmed route and where you are staying next. The aim is to keep the journey connected rather than add a final day simply to fill space.",
  },
  {
    span: "Day 10",
    eyebrow: "Departure · onward travel",
    title: "The last day follows your real travel plans.",
    body: "Flight, train or onward stay determines the final logistics. Those details are confirmed in the Travel Designer proposal rather than assumed on this sample itinerary.",
  },
];

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="reveal pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <ParallaxLayer amount="sm">
            <Eyebrow flank>10-day itinerary example</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              A private ten-day <SectionTitle.Em>Portugal</SectionTitle.Em>, composed with you.
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
              Lisbon, Sintra, the Arrábida coast and the Alentejo connected as one private journey.
              This is a sample shape, not a fixed package: the final route is composed by a human
              Travel Designer around your dates, pace and priorities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <CtaButton to="/multi-day">Work with a travel designer</CtaButton>
              <CtaButton to="/experiences" variant="ghost">
                Browse Signature experiences
              </CtaButton>
            </div>
          </ParallaxLayer>
        </div>
      </section>

      <section className="reveal py-14 bg-[color:var(--ivory)] border-b border-[color:var(--border)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>How this works</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            A reference route, then a <SectionTitle.Em>human proposal</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-5 grid gap-5 md:grid-cols-3 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
            <p>
              <strong className="text-[color:var(--charcoal)]">1 · Share the brief.</strong><br />
              Dates, party, pace, interests and the parts of Portugal that matter most to you.
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">2 · We compose the route.</strong><br />
              A Travel Designer connects real regional experiences into a journey that is
              geographically and operationally sensible.
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">3 · Refine before booking.</strong><br />
              You review the route and key details before the multi-day journey is confirmed.
            </p>
          </div>
        </div>
      </section>

      <section className="reveal py-16 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>How ten days can shape up</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            The <SectionTitle.Em>shape</SectionTitle.Em> of the trip.
          </SectionTitle>
          <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
            The chapters below are grounded in regions and private experiences already present in
            the YES portfolio. They are there to make the idea tangible, not to lock you into ten
            identical days.
          </p>

          <ol className="mt-10 space-y-8">
            {DAYS.map((d) => (
              <li key={d.span} className="border-t border-[color:var(--border)] pt-6">
                <div className="text-[11px] tracking-[0.22em] uppercase text-[color:var(--charcoal)]">
                  {d.span} · {d.eyebrow}
                </div>
                <h3 className="serif text-[22px] md:text-[24px] mt-2 leading-snug text-[color:var(--charcoal)]">
                  {d.title}
                </h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">{d.body}</p>
                {d.anchor && (
                  <Link
                    to={d.anchor.to}
                    className="mt-3 inline-block text-[13px] uppercase tracking-[0.22em] text-[color:var(--teal)]"
                  >
                    {d.anchor.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="reveal py-16 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Travel Designer</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Private, connected, <SectionTitle.Em>built around your pace</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            A multi-day journey is not an instant-bookable bundle of day tours. The Signature
            experiences give the route real foundations; your Travel Designer decides how those
            foundations connect, what stays out and where the journey needs breathing room.
          </p>
          <div className="mt-8">
            <CtaButton to="/multi-day">Start your Travel Designer brief</CtaButton>
          </div>
        </div>
      </section>

      <section className="reveal py-16 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions before you start</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            What this sample <SectionTitle.Em>means</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
            {FAQS.map((item) => (
              <div key={item.q} className="py-6">
                <dt className="serif text-[19px] leading-snug text-[color:var(--charcoal)]">
                  {item.q}
                </dt>
                <dd className="mt-2 text-[14px] md:text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </SiteLayout>
  );
}
