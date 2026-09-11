import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Mail, Star, Car } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RealReviewsStrip } from "@/components/home/RealReviewsStrip";
import { signatureTours } from "@/data/signatureTours";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { regionFaq, type LisbonRegion } from "@/content/lisbon-regions";
import {
  BASED_IN,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  PHONE_DISPLAY,
  PHONE_HREF,
} from "@/config/business-nap";

export const OPENING_HOURS = "Every day, 08:00 – 20:00 (Lisbon time)";

const cardClass =
  "group flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60";

export function regionTours(region: LisbonRegion) {
  return region.tourIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is (typeof signatureTours)[number] => Boolean(t));
}

/**
 * Shared editorial listing page for a region we depart to from Lisbon.
 * Tours, prices and durations come from `signatureTours`; address, hours
 * and contact from `business-nap`; the rating from the review certificate.
 */
export function RegionListingPage({ region }: { region: LisbonRegion }) {
  const tours = regionTours(region);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Day trips from Lisbon", path: "/day-trips-from-lisbon" },
    { name: region.name, path: region.path },
  ];

  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>{region.eyebrow}</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            {region.h1Lead}{" "}
            <span className="italic font-normal text-[color:var(--teal)]">{region.h1Em}</span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            {region.standfirst}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/book">Book &amp; pay online</CtaButton>
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
              Hotel pickup in Lisbon
            </span>
            <span>{LICENSE_LABEL}</span>
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <Eyebrow>The days we run here</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            {region.name}, <SectionTitle.Em>privately, at your pace</SectionTitle.Em>.
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
        </div>
      </section>

      <RealReviewsStrip />

      <section className="py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>Practical details</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Where we are, <SectionTitle.Em>and when we answer</SectionTitle.Em>.
          </SectionTitle>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Address
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
                Opening hours
              </h3>
              <p className="mt-3 flex items-start gap-2 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                <Clock size={15} className="mt-1 shrink-0 text-[color:var(--gold)]" aria-hidden />
                <span>
                  {OPENING_HOURS}
                  <br />
                  {region.driveTime}.
                  <br />
                  {region.bestSeason}
                </span>
              </p>
            </div>

            <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Pickup addresses
              </h3>
              <ul className="mt-3 space-y-2 list-none p-0">
                {region.pickup.map((point) => (
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

            <div className="rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Reserve your day
              </h3>
              <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                Pick a date and pay online in minutes, or send your dates and a local replies
                personally.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <CtaButton to="/book">Book &amp; pay online</CtaButton>
                <CtaButton to="/studio-v3" variant="ghost">
                  Design your own day
                </CtaButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Questions about {region.name}</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Before <SectionTitle.Em>you set the date</SectionTitle.Em>.
          </SectionTitle>
          <dl className="mt-8 space-y-5">
            {regionFaq(region).map((item) => (
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
