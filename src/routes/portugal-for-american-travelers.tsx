import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RealReviewsStrip } from "@/components/home/RealReviewsStrip";
import { breadcrumbLd, faqPageLd, jsonLdScript, localBusinessLd } from "@/lib/jsonld";
import { US_TRAVELER_NOTES } from "@/content/lisbon-day-trip-comparison";
import { WEBSITE_URL, LICENSE_LABEL } from "@/config/business-nap";

/**
 * /portugal-for-american-travelers — top-of-funnel planning page for the
 * US market.
 *
 * Everything here is either general, verifiable travel fact (flight
 * durations, currency, voltage, driving side, tipping custom) or a
 * statement about how we ourselves operate. No tour, stop, partner,
 * price or inclusion is invented.
 */

const PATH = "/portugal-for-american-travelers";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Portugal for American Travelers — A Local's Planning Guide";
const DESCRIPTION =
  "Planning Portugal from the US: flight times, jet lag, money and tipping, driving, best months to go, and how many days you need. Written by a licensed local operator.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Portugal for American travelers", path: PATH },
];

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "Getting here is shorter than most Americans expect",
    body: [
      "Lisbon is the closest European capital to the United States. Non-stop flights run from New York, Newark, Boston, Washington, Miami, Chicago and San Francisco, and the east-coast routes are typically six to seven hours — less than a domestic flight to Hawaii from the same airports.",
      "Almost all of them are overnight flights that land in Lisbon in the morning. That single fact shapes the first two days of every American trip to Portugal, and it is the mistake we most often help people undo.",
    ],
  },
  {
    heading: "Plan your first day badly and you lose two",
    body: [
      "Lisbon is five hours ahead of New York and eight ahead of Los Angeles. You will land somewhere between 7am and 11am having slept badly, and your hotel room will not be ready.",
      "What works: leave the bags at the hotel, stay outdoors and on your feet, eat lunch late the way the Portuguese do, and go to bed at a normal local hour. What does not work: booking a full day trip for the morning you land. We ask guests to put their first day trip on day two, and we would rather move your booking than watch you sleep through the Arrábida coast road.",
    ],
  },
  {
    heading: "Money, tipping and what things actually cost",
    body: [
      "Portugal uses the euro. Cards are accepted almost everywhere, contactless is universal, and you rarely need more than twenty or thirty euros in cash. Your bank converts at the rate on the day, so any dollar figure published in advance would be wrong by the time you read it.",
      "Tipping is not built into wages here the way it is in the US. Rounding up a restaurant bill or leaving five to ten percent after a good day is generous, not expected, and nobody is offended when you do not.",
      "Portugal is noticeably cheaper than France, Italy or Spain for food and wine, and about the same for good hotels. The thing that costs money here is time — private transport, early access, a host who knows which cellar to call.",
    ],
  },
  {
    heading: "You almost certainly do not need a rental car",
    body: [
      "Portugal drives on the right, so that part is familiar. What is not familiar is the parking: historic town centres were built for carts, garages are small, and most rental cars here are manual unless you pay extra and book early.",
      "Distances are also small. Sintra, Arrábida, the Setúbal wine country and the Atlantic beaches are all inside forty minutes of Lisbon; Évora and the Alentejo are ninety. For a week-long trip based in Lisbon, private day trips cost less stress than a rental, and considerably less than a rental plus tolls plus parking plus the day you write off looking for it.",
    ],
  },
  {
    heading: "Language, safety and the practical small print",
    body: [
      "English is widely spoken in Lisbon, Cascais, Sintra and along the tourist coast, and less so in Alentejo villages — which is where a local host stops being a luxury. Portugal is consistently ranked among the safest countries in the world.",
      "Power is 230V with the round two-pin European plug: your phone and laptop chargers are fine with an adapter, American hairdryers usually are not. Tap water is safe to drink. US phone plans mostly work here, but an eSIM is cheaper than most roaming packages.",
    ],
  },
  {
    heading: "When to come",
    body: [
      "April to early June and mid-September through October are the best windows: long warm days, swimmable sea by late spring, and a fraction of the August crowds. July and August are hot, busy and expensive, and the coast books out first.",
      "Winter is Portugal's secret. It is mild rather than cold, the hills are green, the wine cellars are at their most welcoming, and you can have an Arrábida viewpoint entirely to yourself. You trade daylight and a guaranteed swim for space and price.",
    ],
  },
  {
    heading: "How we fit in",
    body: [
      "We are a licensed Portuguese operator based in Sesimbra, forty minutes south of Lisbon. Every day we run is private to your party: your own host, your own vehicle, pickup at your hotel door and a route that gets reshaped when the weather or your mood changes.",
      "Some guests book one Signature day. Others hand us the whole week and we design around their hotel, their flights and what they actually enjoy. Either way you are talking to the people who will be with you on the day, not a call centre.",
    ],
  },
];

const FAQS = [
  {
    q: "How long is the flight from the US to Portugal?",
    a: "Roughly six to seven hours non-stop from the US east coast to Lisbon, and around eleven from the west coast. Lisbon is the closest European capital to North America, and most flights are overnight, landing in the morning.",
  },
  {
    q: "Is Portugal expensive for American travelers?",
    a: "Less than most of western Europe for food, wine and transport, and comparable for good hotels. Portugal uses the euro, cards are accepted everywhere, and you rarely need cash.",
  },
  {
    q: "Do I need to speak Portuguese?",
    a: "No. English is widely spoken in Lisbon and along the coast. Inland, in the Alentejo villages, far less so — which is one practical reason guests travel with a local host there.",
  },
  {
    q: "Is Portugal safe for American tourists?",
    a: "Yes. Portugal ranks among the safest countries in the world. Ordinary city sense in central Lisbon is all that is needed.",
  },
  ...US_TRAVELER_NOTES,
];

export const Route = createFileRoute("/portugal-for-american-travelers")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(breadcrumbLd(crumbs)),
      jsonLdScript(faqPageLd(FAQS)),
      jsonLdScript(
        localBusinessLd({
          path: PATH,
          name: "YES Experiences Portugal — private tours for American travelers",
          description: DESCRIPTION,
          areaServed: ["Lisbon", "Sintra", "Cascais", "Sesimbra", "Setúbal", "Évora", "Comporta"],
        }),
      ),
    ],
  }),
  component: PortugalForAmericans,
});

function PortugalForAmericans() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Planning from the United States</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Portugal for American travelers,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              explained by people who live here.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Flight times, jet lag, money, tipping, driving, the months worth flying for, and how
            long to stay. Everything below is what we tell American guests before they arrive — we
            are a licensed operator based forty minutes south of Lisbon, and we host these days
            ourselves.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/day-trips-from-lisbon">Compare day trips from Lisbon</CtaButton>
            <CtaButton to="/book" variant="ghost">
              Tell us your dates
            </CtaButton>
          </div>
          <p className="mt-6 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {LICENSE_LABEL}
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x max-w-3xl">
          {SECTIONS.map((section) => (
            <article key={section.heading} className="mb-11 last:mb-0">
              <h2 className="font-display text-[1.45rem] md:text-[1.7rem] font-medium leading-snug text-[color:var(--charcoal)]">
                {section.heading}
              </h2>
              {section.body.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  className="mt-4 text-[15.5px] leading-[1.85] text-[color:var(--charcoal-soft)]"
                >
                  {p}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <RealReviewsStrip />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions we get from the US</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            The answers <SectionTitle.Em>before you book the flight</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 space-y-5">
            {FAQS.map((item) => (
              <div
                key={item.q}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-6"
              >
                <dt className="font-display text-[1.05rem] leading-snug text-[color:var(--charcoal)]">
                  {item.q}
                </dt>
                <dd className="mt-2 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-[14px] text-[color:var(--charcoal-soft)]">
            Next:{" "}
            <Link to="/how-many-days-in-portugal" className="underline underline-offset-4">
              how many days you need in Portugal
            </Link>{" "}
            ·{" "}
            <Link to="/day-trips-from-lisbon" className="underline underline-offset-4">
              day trips from Lisbon compared
            </Link>{" "}
            ·{" "}
            <Link to="/lisbon-wine-tours" className="underline underline-offset-4">
              Lisbon wine tours
            </Link>{" "}
            ·{" "}
            <Link to="/faq" className="underline underline-offset-4">
              booking FAQs
            </Link>
          </p>
        </div>
      </section>

      <section className="pb-16 md:pb-24 pt-14 md:pt-20">
        <div className="container-x max-w-3xl text-center">
          <SectionTitle as="h2" spacing="tight">
            Tell us your dates and{" "}
            <SectionTitle.Em>we will shape the days around them</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <CtaButton to="/experiences">See every private day</CtaButton>
            <CtaButton to="/portugal-travel-designer" variant="ghost">
              Design a whole trip
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
