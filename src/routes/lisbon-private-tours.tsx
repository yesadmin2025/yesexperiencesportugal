import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Star } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RealReviewsStrip } from "@/components/home/RealReviewsStrip";
import { HubBookingPicker } from "@/components/booking/HubBookingPicker";
import { signatureTours } from "@/data/signatureTours";
import { LISBON_REGIONS } from "@/content/lisbon-regions";
import {
  breadcrumbLd,
  faqPageLd,
  itemListLd,
  jsonLdScript,
  localBusinessLd,
} from "@/lib/jsonld";
import { LiveReviews } from "@/components/reviews/LiveReviews";
import { areaProfilesFor } from "@/content/lisbon-regions";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { CANCELLATION, LICENSE_LABEL, WEBSITE_URL } from "@/config/business-nap";

/**
 * /lisbon-private-tours — the private Lisbon hub.
 *
 * Featured days, prices and durations come from `signatureTours`; the
 * booking block reuses the standard Signature form (server-resolved
 * pricing). Nothing on this page is invented.
 */

const PATH = "/lisbon-private-tours";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Private Lisbon Tours & Day Trips — Local, Instantly Bookable";
const DESCRIPTION =
  "Private Lisbon tours and day trips run by a licensed local operator: Arrábida wine, Sintra & Cascais, Comporta, Évora and the Atlantic coast. Hotel pickup, your group only, book online.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Private Lisbon tours", path: PATH },
];

const FEATURED_IDS = [
  "arrabida-wine-allinclusive",
  "sintra-cascais",
  "azeitao-cheese",
  "wild-beaches-picnic",
  "troia-comporta",
  "evora-alentejo",
  "arrabida-boat",
  "fatima-nazare-obidos",
] as const;

const FEATURED = FEATURED_IDS.map((id) => signatureTours.find((t) => t.id === id)).filter(
  (t): t is (typeof signatureTours)[number] => Boolean(t),
);

const BOOKABLE_IDS = [
  "arrabida-wine-allinclusive",
  "sintra-cascais",
  "azeitao-cheese",
  "troia-comporta",
] as const;

const FAQS = [
  {
    q: "What is a private Lisbon tour?",
    a: "A day run for your party alone — your own local host, your own vehicle, and a route we adapt as the day goes. We never combine groups.",
  },
  {
    q: "Do private Lisbon tours include hotel pickup?",
    a: "Yes. Pickup is door to door at your Lisbon hotel, apartment or any address you give us, with the return to the same place.",
  },
  {
    q: "How much do private tours from Lisbon cost?",
    a: `Our Signature days start from €${Math.min(...FEATURED.map((t) => t.priceFrom))} per person and the exact price depends on the day and party size. Every price is shown before you pay — no hidden extras.`,
  },
  {
    q: "How far in advance should I book?",
    a: "A few days is usually enough, and we often take next-day bookings. Peak weeks (Easter, June to September, New Year) fill earlier.",
  },
  {
    q: "Can I change or cancel?",
    a: CANCELLATION.signature.en,
  },
];

export const Route = createFileRoute("/lisbon-private-tours")({
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
          name: "YES Experiences Portugal — private Lisbon tours",
          description: DESCRIPTION,
          areaServed: ["Lisbon", "Sintra", "Cascais", "Sesimbra", "Setúbal", "Évora", "Comporta"],
        }),
      ),
      jsonLdScript(
        itemListLd({
          name: "Private Lisbon tours and day trips",
          path: PATH,
          items: FEATURED.map((t) => ({ id: t.id, name: t.title, description: t.blurb })),
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: LisbonPrivateTours,
});

const cardClass =
  "group flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60";

function LisbonPrivateTours() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Lisbon · private · licensed local operator</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Private Lisbon tours,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              run by the people who live here.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            We are a Portuguese operator based in Sesimbra, forty minutes south of Lisbon. Every day
            below leaves from your Lisbon address, belongs to your party alone, and is hosted by
            someone who grew up in the region you are visiting. You can reserve and pay online, or
            tell us your dates and a local writes back personally.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#reserve"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-[color:var(--teal)] px-7 py-3.5 font-sans text-[12.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline"
            >
              Reserve a day
            </a>
            <CtaButton to="/studio-v3" variant="ghost">
              Design your own
            </CtaButton>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <Star size={13} className="text-[color:var(--gold)]" aria-hidden />
              {REVIEW_CERTIFICATE.ratingValue} / {REVIEW_CERTIFICATE.bestRating} ·{" "}
              {REVIEW_CERTIFICATE.reviewCount} reviews
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Car size={13} className="text-[color:var(--gold)]" aria-hidden />
              Hotel pickup included
            </span>
            <span>{LICENSE_LABEL}</span>
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <Eyebrow>Real days, real routes</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Eight private days <SectionTitle.Em>that leave from Lisbon</SectionTitle.Em>.
          </SectionTitle>

          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 list-none p-0">
            {FEATURED.map((tour) => (
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

      {/* ── Booking form ────────────────────────────────── */}
      <section id="reserve" className="scroll-mt-24 bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Reserve online</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Pick a day, <SectionTitle.Em>confirm it in minutes</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-5 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            Choose the day, your date and who is coming. The price is calculated for your party and
            confirmed instantly. {CANCELLATION.signature.en}
          </p>
          <div className="mt-8 rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-7">
            <HubBookingPicker tourIds={BOOKABLE_IDS} />
          </div>
          <p className="mt-6 text-[14px] text-[color:var(--charcoal-soft)]">
            Prefer to talk first?{" "}
            <Link to="/book" className="underline underline-offset-4">
              Send your dates
            </Link>{" "}
            and a local replies personally.
          </p>
        </div>
      </section>

      <RealReviewsStrip />

      <section className="py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>By region</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Where a Lisbon day <SectionTitle.Em>can take you</SectionTitle.Em>.
          </SectionTitle>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 list-none p-0">
            {LISBON_REGIONS.map((region) => (
              <li key={region.path} className={cardClass}>
                <h3 className="font-display text-[1.15rem] leading-snug text-[color:var(--charcoal)]">
                  {region.name}
                </h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {region.driveTime}.
                </p>
                <Link
                  to={region.path}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)] no-underline hover:text-[color:var(--charcoal)]"
                >
                  See the days
                  <span aria-hidden className="text-[color:var(--gold)]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Live guest reviews from days that depart Lisbon. */}
      <LiveReviews
        id="lisbon-reviews"
        ariaLabelledBy="lisbon-reviews-title"
        fallbackTourIds={["arrabida-wine-allinclusive", "sintra-cascais", "troia-comporta"]}
        titleLead="What guests say about"
        titleEm="their day from Lisbon"
        limit={3}
        className="bg-[color:var(--ivory)]"
      />

      {/* Local orientation for the Lisbon pickup area. */}
      <section
        className="border-t border-[color:var(--border)] py-14 md:py-20"
        aria-labelledby="lisbon-areas-title"
      >
        <div className="container-x max-w-4xl">
          <Eyebrow>Local area</Eyebrow>
          <SectionTitle as="h2" id="lisbon-areas-title" spacing="tight">
            Where these days <SectionTitle.Em>begin</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-9 grid gap-8 md:gap-10">
            {areaProfilesFor("/lisbon-private-tours").map((a) => (
              <article key={a.anchor} id={a.anchor} className="scroll-mt-24 md:scroll-mt-28">
                <h3 className="serif text-[1.4rem] leading-snug text-[color:var(--charcoal)] md:text-[1.7rem]">
                  {a.heading}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {a.body}
                </p>
                <dl className="mt-4 grid gap-2 text-[14px] leading-[1.65] text-[color:var(--charcoal-soft)] sm:grid-cols-2">
                  <div>
                    <dt className="font-sans text-[10.5px] font-bold uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
                      Pickup
                    </dt>
                    <dd className="mt-1">{a.pickup}</dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[10.5px] font-bold uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
                      Driving time
                    </dt>
                    <dd className="mt-1">{a.drive}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Private tours in Lisbon</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            The questions <SectionTitle.Em>we are asked most</SectionTitle.Em>.
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
            See also{" "}
            <Link to="/day-trips-from-lisbon" className="underline underline-offset-4">
              day trips from Lisbon
            </Link>
            ,{" "}
            <Link to="/lisbon-wine-tours" className="underline underline-offset-4">
              Lisbon wine tours
            </Link>{" "}
            and our{" "}
            <Link to="/portugal-itinerary" className="underline underline-offset-4">
              Portugal itinerary guide
            </Link>
            . Flying in from the US? Read{" "}
            <Link to="/portugal-for-american-travelers" className="underline underline-offset-4">
              Portugal for American travelers
            </Link>{" "}
            and{" "}
            <Link to="/how-many-days-in-portugal" className="underline underline-offset-4">
              how many days you need
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
