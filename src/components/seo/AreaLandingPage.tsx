import { Link } from "@tanstack/react-router";
import { Car, Clock, Mail, MapPin, Phone, Star } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { trackEvent } from "@/lib/analytics-events";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { LiveReviews } from "@/components/reviews/LiveReviews";
import { signatureTours } from "@/data/signatureTours";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { PICKUP_FAQ, SERVICE_AREA_LINKS } from "@/content/lisbon-regions";
import type { ServiceAreaPage } from "@/content/service-area-pages";
import {
  BASED_IN,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  PHONE_DISPLAY,
  PHONE_HREF,
} from "@/config/business-nap";

export const OPENING_HOURS = "Every day, 08:00 – 20:00 (Lisbon time)";

/** Real Signature days that run from this area. */
export function areaTours(page: ServiceAreaPage) {
  return page.tourIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is (typeof signatureTours)[number] => Boolean(t));
}

/** Visible FAQ list + FAQPage schema source for an area page. */
export function areaFaq(page: ServiceAreaPage) {
  return [...page.faq, ...PICKUP_FAQ];
}

const cardClass =
  "group flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60";

/**
 * Local landing page for one published service area. Tours, durations and
 * prices come from `signatureTours`; address, hours and contact from
 * `business-nap`; the rating from the review certificate.
 */
export function AreaLandingPage({ page }: { page: ServiceAreaPage }) {
  const tours = areaTours(page);
  const bookSearch = tours[0] ? { tour: tours[0].id } : {};

  return (
    <SiteLayout>
      <SiteBreadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Day trips from Lisbon", path: "/day-trips-from-lisbon" },
          { name: page.area, path: page.path },
        ]}
      />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>{page.eyebrow}</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            {page.h1Lead}{" "}
            <span className="italic font-normal text-[color:var(--teal)]">{page.h1Em}</span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            {page.standfirst}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton
              to="/book"
              search={bookSearch}
              onClick={() =>
                trackEvent("booking_cta_click", {
                  placement: `area:${page.area}:hero`,
                  experience_id: tours[0]?.id ?? null,
                  experience_type: "signature",
                })
              }
            >
              Book &amp; pay online
            </CtaButton>
            <CtaButton to="/contact" variant="ghost">
              Ask a local
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
              Door-to-door pickup
            </span>
            <span>{LICENSE_LABEL}</span>
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20" aria-labelledby="area-local-title">
        <div className="container-x max-w-3xl">
          <Eyebrow>Local knowledge</Eyebrow>
          <SectionTitle as="h2" id="area-local-title" spacing="tight">
            {page.area}, <SectionTitle.Em>as we know it</SectionTitle.Em>.
          </SectionTitle>
          <div className="prose-longform mt-7">
            {page.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mt-5 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-[color:var(--border)] py-14 md:py-20"
        aria-labelledby="area-tours-title"
      >
        <div className="container-x">
          <Eyebrow>The days we run here</Eyebrow>
          <SectionTitle as="h2" id="area-tours-title" spacing="tight">
            Private days from {page.area}, <SectionTitle.Em>at your pace</SectionTitle.Em>.
          </SectionTitle>

          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 list-none p-0">
            {tours.map((tour) => (
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
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    to="/book"
                    search={{ tour: tour.id }}
                    onClick={() =>
                      trackEvent("booking_cta_click", {
                        placement: `area:${page.area}:card`,
                        experience_id: tour.id,
                        experience_type: "signature",
                      })
                    }
                    className="inline-flex min-h-[44px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)] no-underline hover:text-[color:var(--charcoal)]"
                  >
                    Book this day · from €{tour.priceFrom}
                    <span aria-hidden className="text-[color:var(--gold)]">
                      →
                    </span>
                  </Link>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: tour.id }}
                    className="inline-flex min-h-[44px] items-center gap-2 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)] no-underline hover:text-[color:var(--charcoal)]"
                  >
                    Full itinerary
                    <span aria-hidden className="text-[color:var(--gold)]">
                      →
                    </span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-[14.5px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            More days across the wider region on{" "}
            <Link to={page.hubPath} className="underline underline-offset-4">
              {page.hubName}
            </Link>
            .
          </p>
        </div>
      </section>

      <LiveReviews
        id="area-reviews"
        ariaLabelledBy="area-reviews-title"
        tourIds={page.tourIds}
        fallbackTourIds={page.tourIds}
        titleLead="What guests say about"
        titleEm={page.area}
        limit={3}
        className="bg-[color:var(--sand)]"
      />

      <section className="py-14 md:py-20" aria-labelledby="area-practical-title">
        <div className="container-x max-w-4xl">
          <Eyebrow>Practical details</Eyebrow>
          <SectionTitle as="h2" id="area-practical-title" spacing="tight">
            Pickup, hours <SectionTitle.Em>and how to reach us</SectionTitle.Em>.
          </SectionTitle>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Pickup addresses
              </h3>
              <ul className="mt-3 space-y-2 list-none p-0">
                {page.pickup.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]"
                  >
                    <Car size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Timing
              </h3>
              <p className="mt-3 flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                <Clock size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                <span>
                  {OPENING_HOURS}
                  <br />
                  {page.driveTime}.
                  <br />
                  {page.bestSeason}
                </span>
              </p>
            </div>

            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Who runs your day
              </h3>
              <p className="mt-3 flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                <MapPin size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                <span>
                  YES Experiences Portugal
                  <br />
                  {BASED_IN} (Setúbal district)
                  <br />
                  {LICENSE_LABEL}
                </span>
              </p>
            </div>

            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Talk to a local
              </h3>
              <p className="mt-3 flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                <Phone size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                <a href={PHONE_HREF} className="underline underline-offset-4">
                  {PHONE_DISPLAY}
                </a>
              </p>
              <p className="mt-2 flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                <Mail size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                <a href={EMAIL_HREF} className="underline underline-offset-4">
                  {EMAIL}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-[color:var(--border)] py-14 md:py-20"
        aria-labelledby="area-network-title"
      >
        <div className="container-x max-w-4xl">
          <Eyebrow>Where we collect you</Eyebrow>
          <SectionTitle as="h2" id="area-network-title" spacing="tight">
            Every area <SectionTitle.Em>we serve</SectionTitle.Em>.
          </SectionTitle>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
            {SERVICE_AREA_LINKS.map((entry) => {
              const current = entry.area === page.area;
              return (
                <li key={entry.area}>
                  {current ? (
                    <span className="flex min-h-[64px] flex-col justify-center rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] px-4 py-3">
                      <span className="font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)]">
                        {entry.area}
                      </span>
                      <span className="mt-1 text-[13.5px] leading-snug text-[color:var(--charcoal-soft)]">
                        You are here · {entry.note}
                      </span>
                    </span>
                  ) : (
                    <Link
                      to={entry.path}
                      hash={entry.anchor}
                      className="flex min-h-[64px] flex-col justify-center rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 no-underline transition-colors duration-200 hover:border-[color:var(--gold)]/60"
                    >
                      <span className="font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)]">
                        {entry.area}
                      </span>
                      <span className="mt-1 text-[13.5px] leading-snug text-[color:var(--charcoal-soft)]">
                        {entry.note}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="pb-16 md:pb-24" aria-labelledby="area-faq-title">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions about {page.area}</Eyebrow>
          <SectionTitle as="h2" id="area-faq-title" spacing="tight">
            Before <SectionTitle.Em>you set the date</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 space-y-5">
            {areaFaq(page).map((item) => (
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
            Back to{" "}
            <Link to="/day-trips-from-lisbon" className="underline underline-offset-4">
              all day trips from Lisbon
            </Link>{" "}
            or read our{" "}
            <Link to="/faq" className="underline underline-offset-4">
              FAQs
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
