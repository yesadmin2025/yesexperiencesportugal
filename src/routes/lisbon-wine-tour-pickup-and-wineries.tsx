import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Grape } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { breadcrumbLd, faqPageLd, jsonLdScript, localBusinessLd } from "@/lib/jsonld";
import { CANCELLATION, LICENSE_LABEL, WEBSITE_URL } from "@/config/business-nap";

/**
 * /lisbon-wine-tour-pickup-and-wineries — supporting page under the
 * /lisbon-wine-tours hub. Answers the two logistics questions guests ask
 * before booking a wine tour from Lisbon: where we collect you, and which
 * cellars you actually visit.
 *
 * Every winery named here is a real stop on the Arrábida and Azeitão
 * Signature days (see src/data/signatureTours.ts). Nothing invented.
 */

const PATH = "/lisbon-wine-tour-pickup-and-wineries";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Lisbon Wine Tour Pickup & Wineries — Where We Collect You";
const DESCRIPTION =
  "Pickup points, timings and the real wineries on a private wine tour from Lisbon: José Maria da Fonseca, Quinta do Piloto, Catralvos, Palmela and Bacalhôa in Azeitão and Setúbal.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Lisbon wine tours", path: "/lisbon-wine-tours" },
  { name: "Pickup & wineries", path: PATH },
];

const PICKUPS = [
  {
    place: "Lisbon hotels & apartments",
    body: "Door-to-door collection anywhere in central Lisbon — hotel lobby, apartment door or a street corner if the road is closed to traffic. Your host confirms the exact spot the evening before.",
  },
  {
    place: "Setúbal, Sesimbra & Almada",
    body: "If you are already south of the river, we collect you there instead. It shortens the drive to the cellars to twenty minutes or less.",
  },
  {
    place: "Cascais & Sintra",
    body: "Possible, and worth saying at booking: the bridge crossing adds around forty minutes each way, so we start earlier and adjust the order of the day.",
  },
];

const WINERIES = [
  {
    name: "José Maria da Fonseca — House & Museum, Azeitão",
    body: "Seven generations of family winemaking since 1834. A cellar walk through one of Portugal's founding houses, then a tasting that usually begins with Moscatel de Setúbal.",
  },
  {
    name: "Quinta do Piloto, Palmela",
    body: "An itinerary option where tradition meets newer winemaking, with the vineyards opening straight onto the Arrábida hills.",
  },
  {
    name: "Quinta de Catralvos",
    body: "A small family producer. You taste at least five wines and hear the whole story — label design to bottling — from the people who did it.",
  },
  {
    name: "Adega Cooperativa de Palmela",
    body: "Optional cellar visit: historic vineyards, time-honoured techniques and a curated tasting of the Palmela reds.",
  },
  {
    name: "Bacalhôa Vinhos de Portugal, Azeitão",
    body: "Quinta da Bacalhôa — a modern winery paired with a striking art collection, which makes it the easiest visit for a non-wine person in the group.",
  },
];

const FAQS = [
  {
    q: "How many wineries does a Lisbon wine tour visit?",
    a: "Two or three. The exact count depends on the experience you choose and on same-day availability at the family cellars — we confirm the pairing with you before the day rather than promising five doors we cannot open.",
  },
  {
    q: "Where does the wine tour from Lisbon pick me up?",
    a: "At your Lisbon hotel or apartment. We also collect from Setúbal, Sesimbra and Almada, and from Cascais or Sintra if you tell us at booking so we can start earlier.",
  },
  {
    q: "What time does pickup happen?",
    a: "Arrábida and Azeitão wine days are 7–9 hours door to door, so pickup is normally mid-morning. The Évora and Alentejo day is 9–11 hours and starts around 8:00, returning after 19:00.",
  },
  {
    q: "Can we choose which wineries we visit?",
    a: "You can tell us what you like — Moscatel, small-producer reds, or somewhere the non-drinkers will still enjoy — and your host builds the order around it. We only use the cellars we actually work with.",
  },
  {
    q: "Is the whole day private?",
    a: "Yes. Your party only, your own host and vehicle. We do not sell seats on shared minibuses, and your host drives and does not taste.",
  },
  {
    q: "Can I change my date?",
    a: CANCELLATION.signature.en,
  },
];

export const Route = createFileRoute("/lisbon-wine-tour-pickup-and-wineries")({
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
        localBusinessLd({
          path: PATH,
          name: "YES Experiences Portugal — wine tour pickup from Lisbon",
          description: DESCRIPTION,
          areaServed: ["Lisbon", "Azeitão", "Setúbal", "Palmela", "Sesimbra"],
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: PickupAndWineries,
});

const cardClass = "rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6";

function PickupAndWineries() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<MapPin aria-hidden />}>
            Pickup · Timings · Cellars
          </Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[2.9rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Wine tour from Lisbon:{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              where we collect you, and whose cellar you sit in.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Two questions decide whether a Lisbon wine tour is worth the day: how you get out of the
            city, and who is pouring at the other end. Both answers are below, with no padding — the
            wineries named here are the ones we actually work with, forty minutes south of Lisbon.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/lisbon-wine-tours" variant="primary">
              See the Lisbon wine tours
            </CtaButton>
            <CtaButton to="/contact" variant="ghost">
              Ask about a cellar
            </CtaButton>
          </div>
          <p className="mt-6 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {LICENSE_LABEL}
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>Pickup</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Door to door, <SectionTitle.Em>not a meeting point</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {PICKUPS.map((p) => (
              <div key={p.place} className={cardClass}>
                <h3 className="font-display text-[1.08rem] leading-snug text-[color:var(--charcoal)]">
                  {p.place}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<Grape aria-hidden />}>
            The cellars
          </Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            The wineries on a <SectionTitle.Em>Lisbon wine tour</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-5 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            You visit two or three of these on the day — the count depends on the experience you
            choose and on availability at the family cellars.
          </p>
          <ul className="mt-8 space-y-5 list-none p-0">
            {WINERIES.map((w) => (
              <li key={w.name} className={cardClass}>
                <h3 className="font-display text-[1.08rem] leading-snug text-[color:var(--charcoal)]">
                  {w.name}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {w.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 pb-16 md:py-20 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Before <SectionTitle.Em>you are collected</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 space-y-5">
            {FAQS.map((item) => (
              <div key={item.q} className={cardClass}>
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
            <Link to="/lisbon-wine-tour-prices-and-inclusions" className="underline underline-offset-4">
              wine tour from Lisbon prices and what is included
            </Link>{" "}
            ·{" "}
            <Link to="/lisbon-wine-tours" className="underline underline-offset-4">
              private Lisbon wine tours
            </Link>{" "}
            ·{" "}
            <Link to="/private-tours-azeitao" className="underline underline-offset-4">
              Azeitão private tours
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
