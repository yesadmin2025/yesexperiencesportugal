import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Clock, MapPin, Star, UtensilsCrossed } from "lucide-react";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { getTourContent, signatureDurationLabel, signatureIncludesLunch } from "@/lib/tourContent";
import { getSignatureCardMoments } from "@/content/signature-card-moments";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { TourImage } from "@/components/tours/TourImage";
import ogImg from "@/assets/hero-coast.jpg";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";

export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Signature Private Experiences in Portugal | YES" },
      {
        name: "description",
        content:
          "A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details.",
      },
      { property: "og:title", content: "Signature Private Experiences in Portugal | YES" },
      {
        property: "og:description",
        content:
          "A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/experiences" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Signature Experiences — private Portugal days" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/experiences" },
      ...localeAlternateLinks("/experiences"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Signature Experiences", path: "/experiences" },
        ]),
      ),
      jsonLdScript(
        itemListLd({
          name: "Signature Experiences",
          path: "/experiences",
          items: signatureTours.map((tour) => ({
            id: tour.id,
            name: tour.title,
            description: tour.blurb,
            image: tour.img,
          })),
        }),
      ),
    ],
  }),
  component: ExperiencesPage,
});

const START_HERE_IDS = ["arrabida-wine-allinclusive", "sintra-cascais", "azeitao-cheese"] as const;

function ExperiencesPage() {
  useMarketingMotion();
  const { resolveImg } = useImportedTourImages();
  const startHere = START_HERE_IDS.map((id) => signatureTours.find((tour) => tour.id === id)).filter(
    (tour): tour is SignatureTour => Boolean(tour),
  );
  const remaining = signatureTours.filter((tour) => !START_HERE_IDS.includes(tour.id as (typeof START_HERE_IDS)[number]));

  return (
    <SiteLayout>
      <section className="pt-32 pb-[var(--section-y-sm)] bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <SiteBreadcrumbs
            containerClassName=""
            className="bg-transparent pt-0 pb-6 text-left"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Signature Experiences", path: "/experiences" },
            ]}
          />
          <Eyebrow flank>Signature Collection</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Private days, <SectionTitle.Em>ready when you are.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-2xl mx-auto text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            Pick a private day that already works beautifully. Reserve it as designed, or tailor a few details after you choose.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-[color:var(--charcoal)]">
            <span>Private guide &amp; vehicle</span>
            <span aria-hidden="true">·</span>
            <span>Door-to-door from Lisbon on listed days</span>
            <span aria-hidden="true">·</span>
            <span>Secure checkout</span>
          </div>
        </div>
      </section>

      <section className="reveal section-y-sm bg-[color:var(--ivory)] border-b border-[color:var(--border)]" aria-labelledby="start-here-title">
        <div className="container-x">
          <div className="max-w-2xl">
            <Eyebrow>Start here</Eyebrow>
            <SectionTitle id="start-here-title" size="compact">
              Three easy places <SectionTitle.Em>to begin.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-4 text-[16px] leading-[1.7] text-[color:var(--charcoal-soft)]">
              A wine-and-food favourite, the classic Sintra coast, or a hands-on local day in Azeitão.
            </p>
          </div>
          <div className="mt-9 grid gap-7 md:grid-cols-3">
            {startHere.map((tour) => (
              <TourCard key={tour.id} tour={tour} resolveImg={resolveImg} featured />
            ))}
          </div>
        </div>
      </section>

      <section className="reveal section-y bg-[color:var(--ivory)]" aria-labelledby="more-signatures-title">
        <div className="container-x">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>More private days</Eyebrow>
              <SectionTitle id="more-signatures-title" size="compact">
                Explore the rest <SectionTitle.Em>of the collection.</SectionTitle.Em>
              </SectionTitle>
            </div>
            <PriceCurrencyChip />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((tour) => (
              <TourCard key={tour.id} tour={tour} resolveImg={resolveImg} />
            ))}
          </div>
        </div>
      </section>

      <CtaStrip />
    </SiteLayout>
  );
}

type ResolveImg = ReturnType<typeof useImportedTourImages>["resolveImg"];

function TourCard({ tour, resolveImg, featured = false }: { tour: SignatureTour; resolveImg: ResolveImg; featured?: boolean }) {
  const meta = VIATOR_META[tour.id];
  const content = getTourContent(tour.id);
  const highlights = (getSignatureCardMoments(tour.id) ?? content.highlights).slice(0, featured ? 3 : 2);

  return (
    <article className="group flex h-full flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-4 text-left transition-all hover:border-[color:var(--gold)]/65 hover:shadow-[0_20px_44px_-34px_rgba(46,46,46,0.4)]" aria-label={tour.title}>
      <Link
        to="/tours/$tourId"
        params={{ tourId: tour.id }}
        className="relative block overflow-hidden rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        aria-label={`Open ${tour.title}`}
      >
        <TourImage
          {...resolveImg(tour, featured ? "lg" : "md")}
          alt={`${tour.title} — private ${tour.theme.toLowerCase()} experience in ${tour.region}, Portugal`}
          ratio="3/2"
          focal={tour.focal ?? "50% 50%"}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.025]"
        >
          <span className="absolute top-3 left-3 bg-[color:var(--ivory)]/94 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[color:var(--teal)]">
            {tour.theme}
          </span>
        </TourImage>
      </Link>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
        <h3 className={`serif font-medium tracking-[-0.012em] leading-[1.16] text-[color:var(--charcoal)] ${featured ? "text-[1.65rem]" : "text-[1.45rem]"}`}>
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {tour.title}
          </Link>
        </h3>

        <p className="mt-3 text-[15px] leading-[1.65] text-[color:var(--charcoal-soft)]">{tour.blurb}</p>

        {highlights.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-[13.5px] leading-[1.55] text-[color:var(--charcoal)]">
            {highlights.map((highlight: string) => (
              <li key={highlight} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid gap-2 text-[12px] tracking-[0.08em] text-[color:var(--charcoal-soft)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {meta && meta.reviewCount > 0 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--charcoal)]">
                <Star size={12} className="text-[color:var(--gold-ink)]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                <strong className="font-medium text-[color:var(--gold-ink)]">{meta.rating.toFixed(1)}</strong>
                <span>({meta.reviewCount})</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock size={12} /> {signatureDurationLabel(tour.id, tour.durationHours)}</span>
            <span className="flex items-center gap-1.5"><MapPin size={12} /> {tour.region}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[color:var(--charcoal)]">
            <span className="whitespace-nowrap">
              From <PriceEur amountEur={tour.priceFrom} role="from" /> <span className="text-[color:var(--charcoal-soft)]">per person</span>
            </span>
            {signatureIncludesLunch(tour.id) && (
              <span className="flex items-center gap-1.5 whitespace-nowrap"><UtensilsCrossed size={12} className="text-[color:var(--gold-ink)]" /> Lunch included</span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <CtaButton
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            variant="primary"
            size="sm"
            className="w-full"
            aria-label={`Reserve ${tour.title}`}
          >
            Check availability &amp; reserve
          </CtaButton>
          <Link
            to="/tours/$tourId/tailor"
            params={{ tourId: tour.id }}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center text-[12px] uppercase tracking-[0.14em] font-medium text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4"
            aria-label={`Tailor ${tour.title}`}
          >
            Tailor this day
          </Link>
        </div>
      </div>
    </article>
  );
}

function CtaStrip() {
  return (
    <section className="reveal section-y-sm pt-0 bg-[color:var(--ivory)]">
      <div className="container-x">
        <div className="bg-[color:var(--teal)] text-[color:var(--ivory)] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[6px]">
          <div>
            <h2 className="serif font-medium text-3xl md:text-4xl text-[color:var(--ivory)]">
              None of these feels <span className="italic font-normal text-[color:var(--ivory)]">quite right?</span>
            </h2>
            <p className="mt-3 text-[15px] md:text-[16px] leading-[1.65] text-[color:var(--ivory)]/88 max-w-lg">
              Build one private day around your mood, group and rhythm, then see the route and live price in the Studio.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="ghostDark" className="flex-shrink-0">
            Design a day in the Studio
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
