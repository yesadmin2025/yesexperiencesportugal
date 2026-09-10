import { createFileRoute, Link } from "@tanstack/react-router";
import { Grape, Star } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RealReviewsStrip } from "@/components/home/RealReviewsStrip";
import { HubBookingPicker } from "@/components/booking/HubBookingPicker";
import { signatureTours } from "@/data/signatureTours";
import {
  breadcrumbLd,
  faqPageLd,
  itemListLd,
  jsonLdScript,
  localBusinessLd,
} from "@/lib/jsonld";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { CANCELLATION, LICENSE_LABEL, WEBSITE_URL } from "@/config/business-nap";

/**
 * /lisbon-wine-tours — wine-intent hub ("Lisbon wine tour", "best Lisbon
 * wine tours", "private wine tours Lisbon"). Every day listed is a real
 * Signature product; regions and durations come from the tour data.
 */

const PATH = "/lisbon-wine-tours";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Lisbon Wine Tours — Best Private Wine Days from Lisbon";
const DESCRIPTION =
  "Private wine tours from Lisbon with a licensed local operator: family cellars in Azeitão and Arrábida, talha wine in the Alentejo and tastings near Sintra. Hotel pickup, book online.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Lisbon wine tours", path: PATH },
];

const WINE_IDS = [
  "arrabida-wine-allinclusive",
  "azeitao-cheese",
  "evora-alentejo",
  "roman-heritage-alentejo",
  "tiles-workshop",
  "sintra-cascais",
] as const;

const WINE_DAYS = WINE_IDS.map((id) => signatureTours.find((t) => t.id === id)).filter(
  (t): t is (typeof signatureTours)[number] => Boolean(t),
);

const BOOKABLE_IDS = [
  "arrabida-wine-allinclusive",
  "azeitao-cheese",
  "evora-alentejo",
] as const;

const REGIONS = [
  {
    name: "Azeitão & Arrábida",
    body: "Forty minutes south of Lisbon, behind the Arrábida ridge. Small family cellars, Moscatel de Setúbal, and cheese made in the same village. The shortest drive and the easiest full day.",
  },
  {
    name: "Évora & the Alentejo",
    body: "Ninety minutes inland: cork oaks, marble villages and wine still fermented in clay amphorae — talha, a practice inherited from the Romans and kept alive by a handful of families.",
  },
  {
    name: "Colares & the Sintra coast",
    body: "The Atlantic side, where vines grow in sand behind the dunes. We fold a tasting into a Sintra and Cascais day rather than pretending it fills one on its own.",
  },
] as const;

const FAQS = [
  {
    q: "Which is the best wine tour from Lisbon?",
    a: "For a first visit, the Arrábida day: two family wineries in Azeitão, the park road, a long lunch and Sesimbra on the way back. It is our most-reviewed day and the shortest drive.",
  },
  {
    q: "Are your Lisbon wine tours private?",
    a: "Always. Your party only, your own host and vehicle. We do not sell seats on shared minibuses.",
  },
  {
    q: "Are tastings and lunch included?",
    a: "On our all-inclusive wine days, yes — the tastings and the meal are in the price you see. Each tour page lists exactly what is included before you pay.",
  },
  {
    q: "How long is a wine day from Lisbon?",
    a: "Seven to nine hours door to door for Azeitão and Arrábida; nine to eleven for Évora and the Alentejo, because the drive is longer.",
  },
  {
    q: "Can the driver drink?",
    a: "No — your host drives and does not taste. That is the point of a private day: everyone in your party can enjoy the wine.",
  },
  {
    q: "Can I change my date?",
    a: CANCELLATION.signature.en,
  },
];

export const Route = createFileRoute("/lisbon-wine-tours")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      jsonLdScript(breadcrumbLd(crumbs)),
      jsonLdScript(
        localBusinessLd({
          path: PATH,
          name: "YES Experiences Portugal — private wine tours from Lisbon",
          description: DESCRIPTION,
          areaServed: ["Lisbon", "Azeitão", "Setúbal", "Sesimbra", "Évora", "Sintra"],
        }),
      ),
      jsonLdScript(
        itemListLd({
          name: "Private wine tours from Lisbon",
          path: PATH,
          items: WINE_DAYS.map((t) => ({ id: t.id, name: t.title, description: t.blurb })),
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: LisbonWineTours,
});

const cardClass =
  "group flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60";

function LisbonWineTours() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<Grape aria-hidden />}>
            Azeitão · Arrábida · Alentejo
          </Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Lisbon wine tours,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              at the tables of the families who make it.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            The wine country nearest Lisbon is not a marketing region — it is our own. We live forty
            minutes from the Azeitão cellars, and the people pouring are people we know. Every day
            here is private, includes hotel pickup, and can be reserved online.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#reserve"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-[color:var(--teal)] px-7 py-3.5 font-sans text-[12.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline"
            >
              Reserve a wine day
            </a>
            <CtaButton to="/contact" variant="ghost">
              Ask about a cellar
            </CtaButton>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <Star size={13} className="text-[color:var(--gold)]" aria-hidden />
              {REVIEW_CERTIFICATE.ratingValue} / {REVIEW_CERTIFICATE.bestRating} ·{" "}
              {REVIEW_CERTIFICATE.reviewCount} reviews
            </span>
            <span>{LICENSE_LABEL}</span>
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <Eyebrow>The wine days</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            The best wine tours from Lisbon,{" "}
            <SectionTitle.Em>as we actually run them</SectionTitle.Em>.
          </SectionTitle>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 list-none p-0">
            {WINE_DAYS.map((tour) => (
              <li key={tour.id} className={cardClass}>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)]">
                  {tour.region}
                </span>
                <h3 className="font-display mt-3 text-[1.2rem] leading-snug text-[color:var(--charcoal)]">
                  {tour.title}
                </h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {tour.blurb}
                </p>
                <p className="mt-4 font-sans text-[11.5px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                  {tour.durationHours} · from €{tour.priceFrom} per person
                </p>
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: tour.id }}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)] no-underline hover:text-[color:var(--charcoal)]"
                >
                  Dates &amp; prices
                  <span aria-hidden className="text-[color:var(--gold)]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>Three wine countries</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            What is <SectionTitle.Em>within reach of Lisbon</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <div
                key={r.name}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6"
              >
                <h3 className="font-display text-[1.1rem] leading-snug text-[color:var(--charcoal)]">
                  {r.name}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reserve" className="scroll-mt-24 py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Reserve online</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Choose your cellars, <SectionTitle.Em>confirm your date</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-7">
            <HubBookingPicker tourIds={BOOKABLE_IDS} />
          </div>
        </div>
      </section>

      <RealReviewsStrip />

      <section className="py-14 pb-16 md:py-20 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Wine questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Before <SectionTitle.Em>the first pour</SectionTitle.Em>.
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
            More:{" "}
            <Link to="/lisbon-private-tours" className="underline underline-offset-4">
              private Lisbon tours
            </Link>{" "}
            ·{" "}
            <Link to="/private-tours-arrabida-sesimbra" className="underline underline-offset-4">
              Arrábida &amp; Sesimbra
            </Link>{" "}
            ·{" "}
            <Link to="/local-stories" className="underline underline-offset-4">
              local stories
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
