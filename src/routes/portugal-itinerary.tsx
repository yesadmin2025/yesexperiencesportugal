import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { breadcrumbLd, faqPageLd, jsonLdScript, tripItineraryLd } from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";

/**
 * /portugal-itinerary — planning guide for "Portugal itinerary" and
 * "how to tour Portugal". Orientation, distances and route shapes only:
 * no invented tours, partners, inclusions or multi-day prices. Real
 * bookable days are linked, never described here as fixed packages.
 */

const PATH = "/portugal-itinerary";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Portugal Itinerary — How to Tour Portugal, by Locals";
const DESCRIPTION =
  "How to plan a Portugal itinerary: 5, 7 and 10-day route shapes, real driving distances, how long to stay in Lisbon, Porto, the Douro and the Alentejo — written by a Portuguese team.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Portugal itinerary", path: PATH },
];

const PRINCIPLES = [
  {
    title: "Two bases beat five hotels.",
    body: "Portugal is small on a map and slow on the ground. Most first trips try four or five stops in ten days and spend a third of the time packing. Two bases — Lisbon and Porto — with day journeys from each, gives you the same country and twice the time in it.",
  },
  {
    title: "Distances are honest, roads are not fast.",
    body: "Lisbon to Sintra or Arrábida is about 40 minutes. Lisbon to Évora, 90 minutes. Lisbon to Porto, roughly three hours by motorway or under three by train. Porto to the Douro at Pinhão, about two hours each way. The Algarve is around 2h30 south of Lisbon.",
  },
  {
    title: "One thing a day, properly.",
    body: "A day with one anchor — a cellar, a coastline, a walled town — and unplanned hours around it is the day people remember. Three anchors in a day is a transfer schedule with views.",
  },
  {
    title: "Season changes the route, not the country.",
    body: "May, June, September and early October are the best weeks: warm, long light, everything open. July and August are hot inland, so we push routes towards the Atlantic. Winter is quiet and clear, and the north looks like a drawing.",
  },
];

const ROUTES = [
  {
    days: "5 days",
    name: "Lisbon and the south of the Tagus",
    body: "Lisbon on foot for two days, then three private days out: Arrábida wine and the coast, Sintra and Cabo da Roca, and Comporta or Évora depending on whether you want sand or stone. One hotel the whole time.",
    day: "Base: Lisbon",
  },
  {
    days: "7 days",
    name: "Lisbon, the Alentejo and the coast",
    body: "The five-day shape plus two slower days inland — Évora, marble villages, talha wine — or south to the Vicentine coast. This is the version for travellers who want quiet more than sights.",
    day: "Base: Lisbon, one night inland optional",
  },
  {
    days: "10 days",
    name: "Lisbon, Centro and Porto with the Douro",
    body: "Four or five days from Lisbon, a slow crossing north through Tomar, Coimbra or the pine coast, then Porto with one full Douro Valley day. Two bases, one long drive, nothing rushed.",
    day: "Bases: Lisbon and Porto",
  },
];

const FAQS = [
  {
    q: "How many days do you need in Portugal?",
    a: "Seven is comfortable for Lisbon and the south. Ten lets you add Porto and the Douro without a forced march. Five is enough if you stay in one base and go out privately each day.",
  },
  {
    q: "What is the best Portugal itinerary for a first visit?",
    a: "Lisbon for three or four nights with private days to Sintra and Arrábida, then Porto for three with one Douro day. Everything else is a variation on that spine.",
  },
  {
    q: "Should I rent a car in Portugal?",
    a: "Not for the cities — Lisbon and Porto are better walked, and parking is genuinely difficult. For the countryside you need a car or a private driver. Most of our guests travel between cities by train and take private days out at each end.",
  },
  {
    q: "Can you do the Douro Valley from Lisbon?",
    a: "Not well: it is around four hours each way. The Douro belongs to a Porto base or a multi-day route north.",
  },
  {
    q: "When is the best time to visit Portugal?",
    a: "May, June, September and early October. Warm without the August heat, long evenings, and the coast and wine country at their best.",
  },
  {
    q: "How do we plan this with you?",
    a: "Tell us your dates, who is travelling and how you like to move. A Travel Designer comes back with a route, the days that fit it, and a price — no fixed package, no obligation.",
  },
];

export const Route = createFileRoute("/portugal-itinerary")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(breadcrumbLd(crumbs)),
      jsonLdScript(
        tripItineraryLd({
          path: PATH,
          name: "How to tour Portugal — route shapes for 5, 7 and 10 days",
          description: DESCRIPTION,
          touristType: "Private, slow-paced travel",
          days: ROUTES.map((r) => ({ name: `${r.days} — ${r.name}`, description: r.body })),
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: PortugalItinerary,
});

function PortugalItinerary() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Planning · written in Portugal</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            How to tour Portugal{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              without spending the trip in the car.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            This is the advice we give on the phone, written down: how long the country really
            takes, where to base yourself, and what a five, seven or ten-day route looks like when
            it is built by people who drive these roads every week.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/portugal-travel-designer">Plan with a Travel Designer</CtaButton>
            <CtaButton to="/itineraries/10-day-private-portugal-tour" variant="ghost">
              See a 10-day sample
            </CtaButton>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Four rules</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            What makes a Portugal itinerary{" "}
            <SectionTitle.Em>work or fall apart</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-10 space-y-8">
            {PRINCIPLES.map((p) => (
              <article key={p.title}>
                <h3 className="font-display text-[1.25rem] leading-snug text-[color:var(--charcoal)]">
                  {p.title}
                </h3>
                <p className="mt-3 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>Route shapes</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Five, seven or ten days — <SectionTitle.Em>three honest shapes</SectionTitle.Em>.
          </SectionTitle>
          <ol className="mt-10 grid gap-5 md:grid-cols-3 list-none p-0">
            {ROUTES.map((r) => (
              <li
                key={r.days}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6"
              >
                <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)]">
                  {r.days}
                </span>
                <h3 className="font-display mt-3 text-[1.15rem] leading-snug text-[color:var(--charcoal)]">
                  {r.name}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {r.body}
                </p>
                <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  {r.day}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[14.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            These are shapes, not packages. The private days that fill them are real and bookable —{" "}
            <Link to="/day-trips-from-lisbon" className="underline underline-offset-4">
              day trips from Lisbon
            </Link>
            ,{" "}
            <Link to="/lisbon-wine-tours" className="underline underline-offset-4">
              wine days
            </Link>{" "}
            and{" "}
            <Link to="/multi-day" className="underline underline-offset-4">
              multi-day journeys
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="py-14 pb-16 md:py-20 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Planning questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Answers <SectionTitle.Em>before you book flights</SectionTitle.Em>.
          </SectionTitle>
          <Accordion type="single" collapsible className="mt-8">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`q-${i}`}>
                <AccordionTrigger className="text-left font-display text-[1.02rem] leading-snug text-[color:var(--charcoal)]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[14.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10 rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-6">
            <h2 className="font-display text-[1.3rem] leading-snug text-[color:var(--charcoal)]">
              Want the route written for you?
            </h2>
            <p className="mt-3 text-[15px] leading-[1.8] text-[color:var(--charcoal-soft)]">
              Send your dates and how you like to travel. A Travel Designer replies with a route,
              the days that fit it and a price.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <CtaButton to="/portugal-travel-designer">Plan my Portugal trip</CtaButton>
              <CtaButton to="/faq" variant="ghost">
                Read the FAQs
              </CtaButton>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
