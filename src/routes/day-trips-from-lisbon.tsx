import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Mail, Star, Car } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { RealReviewsStrip } from "@/components/home/RealReviewsStrip";
import { signatureTours } from "@/data/signatureTours";
import { breadcrumbLd, faqPageLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import {
  BASED_IN,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  PHONE_DISPLAY,
  PHONE_HREF,
  WEBSITE_URL,
  CANCELLATION,
} from "@/config/business-nap";

/**
 * /day-trips-from-lisbon — local SEO landing page.
 *
 * Everything on this page is authoritative: the featured days come from
 * `signatureTours`, the NAP block and opening hours from `business-nap`
 * and the Organization JSON-LD, the rating from the public review
 * certificate, and the guest quotes from real Viator/Tripadvisor reviews
 * already shown on the tour pages. Nothing here is invented.
 */

const PATH = "/day-trips-from-lisbon";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Day Trips from Lisbon — Private, Local & Instantly Bookable";
const DESCRIPTION =
  "Private day trips from Lisbon by a licensed local operator: Arrábida wine, Sintra & Cascais, Comporta, Évora and the wild Atlantic coast. Hotel pickup, your group only.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Day trips from Lisbon", path: PATH },
];

/** Featured days that genuinely depart from Lisbon, in search-demand order. */
const FEATURED_IDS = [
  "arrabida-wine-allinclusive",
  "sintra-cascais",
  "wild-beaches-picnic",
  "troia-comporta",
  "evora-alentejo",
  "arrabida-boat",
] as const;

const FEATURED = FEATURED_IDS.map((id) => signatureTours.find((t) => t.id === id)).filter(
  (t): t is (typeof signatureTours)[number] => Boolean(t),
);

const OPENING_HOURS = "Every day, 08:00 – 20:00 (Lisbon time)";

const FAQS = [
  {
    q: "Where do day trips from Lisbon start?",
    a: "At your hotel, apartment or any Lisbon address you give us. Pickup is door to door, and the return is to the same place at the end of the day.",
  },
  {
    q: "How long is a day trip from Lisbon?",
    a: "Most of our days run seven to nine hours door to door. Arrábida and Sintra are about 40 minutes from Lisbon; Évora and the Alentejo are around 90 minutes, so those days start a little earlier.",
  },
  {
    q: "Are the day trips private?",
    a: "Always. Your group only, your own local host and a vehicle dedicated to your day. We never combine parties.",
  },
  {
    q: "Can I book a Lisbon day trip instantly?",
    a: "Yes. Every Signature day shows live dates and prices and can be reserved and paid for online in a couple of minutes. If you would rather talk it through first, send a request and a local replies personally.",
  },
  {
    q: "What if the weather changes?",
    a: `Your host reshapes the day around it — the coast, the cellars and the villages all have good-weather and bad-weather versions. ${CANCELLATION.signature.en}`,
  },
];

export const Route = createFileRoute("/day-trips-from-lisbon")({
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
        itemListLd({
          name: "Private day trips from Lisbon",
          path: PATH,
          items: FEATURED.map((t) => ({
            id: t.id,
            name: t.title,
            description: t.blurb,
          })),
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: DayTripsFromLisbon,
});

const cardClass =
  "group flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-colors duration-200 hover:border-[color:var(--gold)]/60";

function DayTripsFromLisbon() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank>Lisbon · Setúbal · Alentejo</Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[3rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Day trips from Lisbon,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              designed by people who live here.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            We are a licensed Portuguese operator based in Sesimbra, forty minutes south of Lisbon.
            Every day below is private to your party, starts at your Lisbon address, and is hosted
            by someone from the region you are visiting — wine in Arrábida, palaces in Sintra, empty
            beaches on the Atlantic, cork and marble in the Alentejo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton to="/experiences">See every private day</CtaButton>
            <CtaButton to="/book" variant="ghost">
              Tell us your dates
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

      {/* ── The days ─────────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="container-x">
          <Eyebrow>The days we run most</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Six day trips from Lisbon, <SectionTitle.Em>each a real route</SectionTitle.Em>.
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

      {/* ── Real reviews ─────────────────────────────────── */}
      <RealReviewsStrip />

      {/* ── Where we are ─────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="container-x max-w-4xl">
          <Eyebrow>Where we are</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            A local operator, <SectionTitle.Em>forty minutes from Lisbon</SectionTitle.Em>.
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
                  Pickups across Lisbon, Cascais, Sintra, Sesimbra and Setúbal.
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

            <div className="rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-6">
              <h3 className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Reserve your day
              </h3>
              <p className="mt-3 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                Pay and confirm online in minutes, or send your dates and a local replies
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

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="pb-16 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Practical questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Everything you need <SectionTitle.Em>before the pickup</SectionTitle.Em>.
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
            More answers on our{" "}
            <Link to="/faq" className="underline underline-offset-4">
              FAQs page
            </Link>
            , or read the{" "}
            <Link to="/local-stories" className="underline underline-offset-4">
              local stories
            </Link>{" "}
            we write about these regions.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
