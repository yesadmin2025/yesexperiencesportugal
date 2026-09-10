import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { signatureTours } from "@/data/signatureTours";
import { breadcrumbLd, faqPageLd, jsonLdScript, itemListLd } from "@/lib/jsonld";
import { WEBSITE_URL } from "@/config/business-nap";

/**
 * /how-many-days-in-portugal — planning page for "portugal trip packages",
 * "how many days in portugal" and "how to tour portugal" intent.
 *
 * Every named day maps to a real Signature tour id; nothing invents a
 * stop, a hotel, an inclusion or a package price. The trip shapes are
 * planning advice, not products.
 */

const PATH = "/how-many-days-in-portugal";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "How Many Days Do You Need in Portugal? 5, 7, 10 or 14";
const DESCRIPTION =
  "How many days you need in Portugal, from a local operator: what fits in 5, 7, 10 and 14 days, what to cut, and which private days are worth the drive from Lisbon.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "How many days in Portugal", path: PATH },
];

interface TripShape {
  length: string;
  verdict: string;
  body: string;
  days: { label: string; tourId?: string }[];
}

const SHAPES: TripShape[] = [
  {
    length: "5 days",
    verdict: "Lisbon and its coast, and nothing further",
    body: "Five days is a city trip with two excursions, and it is better spent well than spread thin. Base yourself in Lisbon, give the city two unhurried days, and use the other two for the coast and the wine country on its doorstep. Trying to add Porto or the Algarve to five days means most of the trip happens on a motorway.",
    days: [
      { label: "Lisbon on foot — no car, no plan" },
      { label: "Sintra, Cabo da Roca and Cascais", tourId: "sintra-cascais" },
      { label: "Arrábida wine country and the coast", tourId: "arrabida-wine-allinclusive" },
      { label: "Lisbon again — the parts you missed" },
    ],
  },
  {
    length: "7 days",
    verdict: "The sweet spot for a first trip",
    body: "A week is where Portugal starts to feel like a country rather than a city break. Keep Lisbon as your base, take three day trips in different directions — coast, wine country, inland Alentejo — and leave two days with nothing planned. That unplanned time is consistently what guests describe best afterwards.",
    days: [
      { label: "Lisbon, slowly" },
      { label: "Sintra, Cabo da Roca and Cascais", tourId: "sintra-cascais" },
      { label: "Arrábida wine country", tourId: "arrabida-wine-allinclusive" },
      { label: "Évora and the Alentejo", tourId: "evora-alentejo" },
      { label: "Beaches and coves, or a boat day", tourId: "wild-beaches-picnic" },
      { label: "Nothing at all" },
    ],
  },
  {
    length: "10 days",
    verdict: "Lisbon plus a second region, properly",
    body: "Ten days lets you add a genuine second base — the Alentejo, the Silver Coast, or the Douro if wine is the point of the trip — without the week feeling like a relay. This is the length we design most often as a full travel-designed trip rather than a set of separate days.",
    days: [
      { label: "Lisbon and the coast, as above" },
      { label: "Azeitão cheese-making and Moscatel", tourId: "azeitao-cheese" },
      { label: "Tróia, Comporta and the estuary", tourId: "troia-comporta" },
      { label: "Hidden Alentejo and talha wine", tourId: "roman-heritage-alentejo" },
      { label: "Tomar and Coimbra, heading north", tourId: "tomar-coimbra" },
    ],
  },
  {
    length: "14 days",
    verdict: "The whole country, at a Portuguese pace",
    body: "Two weeks is enough for Lisbon, the south and the north without rushing any of them. It is also long enough that the trip needs shaping rather than listing — which is exactly what a Travel Designer does: your hotels, your flights, your energy levels, and days built around them.",
    days: [
      { label: "Everything in the ten-day shape" },
      { label: "Fátima, Nazaré and Óbidos", tourId: "fatima-nazare-obidos" },
      { label: "The Southwest Vicentine coast", tourId: "southwest-vicentine-coast" },
      { label: "Time in the north, or the Algarve, unhurried" },
    ],
  },
];

const FAQS = [
  {
    q: "How many days do you need in Portugal?",
    a: "Seven is the sweet spot for a first trip: two days in Lisbon, three day trips in different directions, and two days with nothing planned. Five works if you stay near Lisbon; ten or fourteen lets you add a second region properly.",
  },
  {
    q: "Is 5 days enough for Portugal?",
    a: "It is enough for Lisbon and its coast — Sintra, Arrábida, the beaches and the wine country are all within forty minutes. It is not enough to add Porto or the Algarve without spending most of the trip travelling.",
  },
  {
    q: "How many days do you need in Lisbon itself?",
    a: "Two to three. Lisbon is walkable and small, and the surrounding region is where the rest of your time goes.",
  },
  {
    q: "What is the best way to tour Portugal?",
    a: "Base yourself in one or two places and travel out by day rather than moving hotels every night. Distances are short, so a private day trip gets you further than a rental car and back in time for dinner.",
  },
  {
    q: "Do you sell fixed Portugal packages?",
    a: "No. We publish real private days with live dates and prices, and we design longer trips individually with a Travel Designer. We do not sell a boxed package, because the good version of a Portugal trip depends on your hotel, your flights and what you actually enjoy.",
  },
  {
    q: "When should we visit?",
    a: "April to early June and mid-September to October give the best combination of weather, daylight and space. July and August are hot and busy; winter is mild, green and very quiet.",
  },
];

const LISTED = SHAPES.flatMap((s) => s.days)
  .map((d) => d.tourId)
  .filter((id): id is string => Boolean(id));
const UNIQUE_TOURS = Array.from(new Set(LISTED))
  .map((id) => signatureTours.find((t) => t.id === id))
  .filter((t): t is (typeof signatureTours)[number] => Boolean(t));

export const Route = createFileRoute("/how-many-days-in-portugal")({
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
        itemListLd({
          name: "Private days that shape a Portugal trip",
          path: PATH,
          items: UNIQUE_TOURS.map((t) => ({ id: t.id, name: t.title, description: t.blurb })),
        }),
      ),
    ],
  }),
  component: HowManyDays,
});

function HowManyDays() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Trip planning · Portugal</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            How many days do you need in Portugal?{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              Seven, if you are asking.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Below is what genuinely fits in five, seven, ten and fourteen days, what we would cut
            first, and which private days are worth the drive. We are a licensed Portuguese
            operator based south of Lisbon, and these are the trips we build for guests every week.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/portugal-travel-designer">Design my trip</CtaButton>
            <CtaButton to="/day-trips-from-lisbon" variant="ghost">
              Compare day trips
            </CtaButton>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Four trip shapes</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            What actually fits, <SectionTitle.Em>without the motorway</SectionTitle.Em>.
          </SectionTitle>

          <div className="mt-10 space-y-8">
            {SHAPES.map((shape) => (
              <article
                key={shape.length}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 md:p-8"
              >
                <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)]">
                  {shape.length}
                </span>
                <h3 className="font-display mt-3 text-[1.35rem] leading-snug text-[color:var(--charcoal)]">
                  {shape.verdict}
                </h3>
                <p className="mt-3 text-[15.5px] leading-[1.85] text-[color:var(--charcoal-soft)]">
                  {shape.body}
                </p>
                <ul className="mt-5 space-y-2 list-none p-0">
                  {shape.days.map((day) => (
                    <li
                      key={day.label}
                      className="flex gap-3 text-[14.5px] leading-[1.7] text-[color:var(--charcoal-soft)]"
                    >
                      <span aria-hidden className="text-[color:var(--gold)]">
                        —
                      </span>
                      {day.tourId ? (
                        <Link
                          to="/tours/$tourId"
                          params={{ tourId: day.tourId }}
                          className="underline underline-offset-4"
                        >
                          {day.label}
                        </Link>
                      ) : (
                        <span>{day.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-9 text-[14.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Want to see one written out in full? Read our{" "}
            <Link
              to="/itineraries/10-day-private-portugal-tour"
              className="underline underline-offset-4"
            >
              sample 10-day private Portugal itinerary
            </Link>
            , or the broader{" "}
            <Link to="/portugal-itinerary" className="underline underline-offset-4">
              Portugal itinerary guide
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Common questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Length, pace and <SectionTitle.Em>what to leave out</SectionTitle.Em>.
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
            Flying from the US? Start with{" "}
            <Link to="/portugal-for-american-travelers" className="underline underline-offset-4">
              Portugal for American travelers
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
