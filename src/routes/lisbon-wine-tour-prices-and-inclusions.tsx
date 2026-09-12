import { createFileRoute, Link } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { HubBookingPicker } from "@/components/booking/HubBookingPicker";
import { signatureTours } from "@/data/signatureTours";
import { breadcrumbLd, faqPageLd, jsonLdScript, localBusinessLd } from "@/lib/jsonld";
import { CANCELLATION, LICENSE_LABEL, WEBSITE_URL } from "@/config/business-nap";

/**
 * /lisbon-wine-tour-prices-and-inclusions — supporting page under the
 * /lisbon-wine-tours hub. Prices and inclusions come straight from the
 * Signature tour data, so this page can never drift from what a guest pays.
 */

const PATH = "/lisbon-wine-tour-prices-and-inclusions";
const PAGE_URL = `${WEBSITE_URL}${PATH}`;
const TITLE = "Lisbon Wine Tour Prices — What's Included, Per Person";
const DESCRIPTION =
  "What a private wine tour from Lisbon costs and what the price covers: tastings, lunch, private transport and a licensed local host. Prices per person from €101, booked online.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Lisbon wine tours", path: "/lisbon-wine-tours" },
  { name: "Prices & what's included", path: PATH },
];

const PRICED_IDS = ["azeitao-cheese", "arrabida-wine-allinclusive", "evora-alentejo"] as const;

const DAYS = PRICED_IDS.map((id) => signatureTours.find((t) => t.id === id)).filter(
  (t): t is (typeof signatureTours)[number] => Boolean(t),
);

const BOOKABLE_IDS = PRICED_IDS;

const FAQS = [
  {
    q: "How much is a wine tour from Lisbon?",
    a: "Per person, from €101 for the Azeitão cheese-and-wine day, from €135 for the all-inclusive Arrábida wine tour and from €169 for the Évora and Alentejo day. The price you see on the tour page is the price you pay — private vehicle, host and tastings included.",
  },
  {
    q: "Are wine tastings included in the price?",
    a: "Yes, on every wine day listed here. On the all-inclusive Arrábida tour the tastings, snacks and lunch with paired wines are all inside the price.",
  },
  {
    q: "Is lunch included?",
    a: "On the Arrábida all-inclusive day, yes — a long traditional lunch in Azeitão. On the Évora and Alentejo day lunch is not included, deliberately, so the pace and the table stay your choice; entrance fees there are included instead.",
  },
  {
    q: "Is the price per person or per group?",
    a: "Per person, and it falls as the group grows because the vehicle and host are shared across your own party. The booking form shows the exact total for your group size before you pay.",
  },
  {
    q: "Are there extra costs on the day?",
    a: "No compulsory ones. Bottles you decide to take home, and any meal that a tour page lists as not included, are the only things you would pay for separately.",
  },
  {
    q: "How do I pay, and can I cancel?",
    a: CANCELLATION.signature.en,
  },
];

export const Route = createFileRoute("/lisbon-wine-tour-prices-and-inclusions")({
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
          name: "YES Experiences Portugal — wine tour prices from Lisbon",
          description: DESCRIPTION,
          areaServed: ["Lisbon", "Azeitão", "Setúbal", "Évora"],
        }),
      ),
      jsonLdScript(faqPageLd(FAQS)),
    ],
  }),
  component: PricesAndInclusions,
});

const cardClass = "rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-6";

function PricesAndInclusions() {
  return (
    <SiteLayout>
      <SiteBreadcrumbs crumbs={crumbs} />

      <section className="bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow flank icon={<Receipt aria-hidden />}>
            Prices · Inclusions · Cancellation
          </Eyebrow>
          <h1 className="font-display mt-5 text-[2rem] sm:text-[2.4rem] md:text-[2.9rem] font-medium leading-[1.08] tracking-[-0.02em] text-[color:var(--charcoal)]">
            Lisbon wine tour prices,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              and exactly what the price covers.
            </span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            A private wine tour from Lisbon should not need a phone call to price. Below is what each
            wine day costs per person, what sits inside that number, and the one day where lunch is
            deliberately left out.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#reserve"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-[color:var(--teal)] px-7 py-3.5 font-sans text-[12.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline"
            >
              Reserve a wine day
            </a>
            <CtaButton to="/lisbon-wine-tour-pickup-and-wineries" variant="ghost">
              Pickup &amp; wineries
            </CtaButton>
          </div>
          <p className="mt-6 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {LICENSE_LABEL}
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-x">
          <Eyebrow>Per person, from</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            What each <SectionTitle.Em>wine tour from Lisbon</SectionTitle.Em> includes.
          </SectionTitle>
          <ul className="mt-10 grid gap-5 md:grid-cols-3 list-none p-0">
            {DAYS.map((tour) => (
              <li key={tour.id} className={`${cardClass} flex flex-col`}>
                <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--gold)]">
                  {tour.region}
                </span>
                <h3 className="font-display mt-3 text-[1.15rem] leading-snug text-[color:var(--charcoal)]">
                  {tour.title}
                </h3>
                <p className="mt-3 font-sans text-[11.5px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                  {tour.durationHours} · from €{tour.priceFrom} per person
                </p>
                <ul className="mt-4 flex-1 space-y-2 list-none p-0 text-[14px] leading-[1.7] text-[color:var(--charcoal-soft)]">
                  {tour.included.slice(0, 6).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden className="text-[color:var(--gold)]">
                        ·
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: tour.id }}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)] no-underline hover:text-[color:var(--charcoal)]"
                >
                  Full inclusions &amp; dates
                  <span aria-hidden className="text-[color:var(--gold)]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="reserve" className="scroll-mt-24 bg-[color:var(--sand)] py-14 md:py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Reserve online</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            Pick your day, <SectionTitle.Em>see the exact total</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-7">
            <HubBookingPicker tourIds={BOOKABLE_IDS} />
          </div>
        </div>
      </section>

      <section className="py-14 pb-16 md:py-20 md:pb-24">
        <div className="container-x max-w-3xl">
          <Eyebrow>Price questions</Eyebrow>
          <SectionTitle as="h2" spacing="tight">
            No <SectionTitle.Em>surprises on the day</SectionTitle.Em>.
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
            Also:{" "}
            <Link to="/lisbon-wine-tours" className="underline underline-offset-4">
              private wine tours from Lisbon
            </Link>{" "}
            ·{" "}
            <Link
              to="/lisbon-wine-tour-pickup-and-wineries"
              className="underline underline-offset-4"
            >
              Lisbon wine tour pickup and wineries
            </Link>{" "}
            ·{" "}
            <Link to="/private-tours-arrabida-sesimbra" className="underline underline-offset-4">
              Arrábida &amp; Sesimbra
            </Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
