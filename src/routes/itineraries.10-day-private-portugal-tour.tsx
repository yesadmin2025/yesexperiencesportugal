import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { jsonLdScript, breadcrumbLd, tripItineraryLd, SITE_URL } from "@/lib/jsonld";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import ogSocialImg from "@/assets/cat-multiday.jpg";

/**
 * /itineraries/10-day-private-portugal-tour
 *
 * Editorial positioning page targeting "portugal tours" and
 * "portugal trips packages". It does NOT invent a bookable multi-day
 * product — per brand rules we never fabricate stops, partners,
 * inclusions or prices. Instead it describes the shape of a private
 * ten-day journey (Lisbon → Sintra → Arrábida → Alentejo → return),
 * grounded in our real Signature day experiences, and hands off to the
 * Travel Designer at /multi-day where a human composes the actual
 * itinerary with the guest.
 */

const PAGE_PATH = "/itineraries/10-day-private-portugal-tour";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "10-Day Private Portugal Tour | Luxury Itinerary by YES";
const DESCRIPTION =
  "A private 10-day Portugal tour, composed with a human travel designer — Lisbon, Sintra, Arrábida coast and Alentejo wine country. Real experiences, real pace.";

const tripLd = tripItineraryLd({
  path: PAGE_PATH,
  name: "10-Day Private Portugal Tour",
  description: DESCRIPTION,
  touristType: "Luxury private travellers · couples · small families",
  days: [
    {
      name: "Lisbon — arrival, quiet neighbourhoods, hidden Fado",
      description:
        "Arrival day in Lisbon at a slow pace: quiet neighbourhoods away from the crowds and an intimate Fado evening.",
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
      name: "Return to Lisbon — private farewell dinner",
      description: "A slow return to Lisbon and a private farewell dinner to close the journey.",
    },
  ],
});

export const Route = createFileRoute("/itineraries/10-day-private-portugal-tour")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
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
          { name: "Itineraries", path: "/itineraries/10-day-private-portugal-tour" },
          { name: "10-day private Portugal tour", path: PAGE_PATH },
        ]),
      ),
      jsonLdScript(tripLd),
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
    title: "Lisbon at its quieter angles.",
    body: "Land, settle, and let the city arrive slowly. A private neighbourhood walk through Alfama or Príncipe Real, a table your driver-guide actually eats at, and — if the mood is right — a small Fado room away from the tourist rooms.",
  },
  {
    span: "Day 3",
    eyebrow: "Sintra · Cabo da Roca",
    title: "Palaces, then the edge of Europe.",
    body: "A private Sintra day paced for photography rather than queues — Pena, Quinta da Regaleira, and a long look at the Atlantic from Cabo da Roca before returning through Cascais.",
    anchor: { label: "See the Sintra Signature", to: "/tours/sintra-cascais" },
  },
  {
    span: "Day 4",
    eyebrow: "Arrábida · Sesimbra",
    title: "The coast most guests never see.",
    body: "South of the river, the Arrábida ridge falls straight into a Mediterranean-blue sea. A morning viewpoint, a fresh-fish lunch in Sesimbra, and time in a hidden cove.",
    anchor: { label: "See the Arrábida Signature", to: "/tours/arrabida-boat" },
  },
  {
    span: "Day 5",
    eyebrow: "Azeitão · wine & cheese",
    title: "Small producers, generous tables.",
    body: "Two family wineries and a cheese producer near Azeitão — the kind our team drinks with on days off. Small pours, longer conversations.",
    anchor: { label: "See the Arrábida Wine Signature", to: "/tours/arrabida-wine-allinclusive" },
  },
  {
    span: "Days 6–7",
    eyebrow: "Alentejo · Évora",
    title: "UNESCO Évora and cork country.",
    body: "Overnight into the Alentejo. A private walk of Évora's old town, two family wineries in the surrounding countryside, and a long Alentejo lunch under vine cover.",
    anchor: { label: "See the Alentejo Signature", to: "/tours/evora-alentejo" },
  },
  {
    span: "Day 8",
    eyebrow: "Alentejo · slow day",
    title: "A day for whichever direction the trip has taken.",
    body: "A quiet estate morning, an olive-oil producer, or an extra long lunch — the day your travel designer keeps open on purpose, and shapes with you once we know how the first week has felt.",
  },
  {
    span: "Day 9",
    eyebrow: "Return · Lisbon",
    title: "Back to the city, unhurried.",
    body: "Scenic route back to Lisbon with one stop along the way. Afternoon at leisure, then a private farewell dinner your designer books once we know the group.",
  },
  {
    span: "Day 10",
    eyebrow: "Departure",
    title: "Private transfer to the airport.",
    body: "Timed to your flight. If schedules allow, one last coffee at a bakery locals actually use.",
  },
];

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="reveal pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <ParallaxLayer amount="sm">
            <Eyebrow flank>10-day itinerary</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              A private ten-day <SectionTitle.Em>Portugal</SectionTitle.Em>, composed with you.
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
              Lisbon, Sintra, the Arrábida coast and the Alentejo — stitched into a single,
              unhurried private journey. Ten days is the shape most of our guests settle into; the
              exact days are composed with your travel designer once we know how you want it to
              feel.
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

      {/* Day-by-day */}
      <section className="reveal py-16 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>How ten days usually shape up</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            The <SectionTitle.Em>shape</SectionTitle.Em> of the trip.
          </SectionTitle>
          <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
            Every day here is drawn from experiences we already run. Nothing is a stock package.
            Your designer swaps, stretches or removes days so the itinerary matches your pace,
            appetites and travelling company.
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

      {/* Why us / positioning */}
      <section className="reveal py-16 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Luxury, without theatre</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            Private, licensed, <SectionTitle.Em>founder-built</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            YES Experiences Portugal is a licensed Portuguese private tour operator. Every day above
            is an experience we run ourselves — with our own driver-guides, our own partners, and
            tables our team eats at. No re-sold packages, no invented partners.
          </p>
          <div className="mt-8">
            <CtaButton to="/multi-day">Start composing your ten days</CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
