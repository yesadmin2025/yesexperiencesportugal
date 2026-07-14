import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";
import { RelatedExperiencesRail } from "@/components/RelatedExperiencesRail";
import { rankRelatedTours } from "@/lib/related-experiences";
import { findTour } from "@/data/signatureTours";
import {
  LOCAL_STORIES_ARTICLES,
  type LocalStoryArticle,
} from "@/content/local-stories-articles";
import type { PlanningDestination } from "@/content/planning/destinations";

interface Props {
  destination: PlanningDestination;
}

export function PlanningDestinationPage({ destination }: Props) {
  const featured = destination.signatureIds
    .map((id) => findTour(id))
    .filter((t): t is NonNullable<ReturnType<typeof findTour>> => Boolean(t));

  const rail = rankRelatedTours(
    {
      region: destination.regionSeed,
      styles: destination.styleSeed,
      excludeTourId: undefined,
    },
    3,
  );
  // Prefer the manually featured signatures on the rail — fall back to
  // the recommender if the destination doesn't list any.
  const tours = featured.length > 0 ? featured.slice(0, 3) : rail;

  const stories = destination.relatedStorySlugs
    .map((slug) => LOCAL_STORIES_ARTICLES.find((s) => s.slug === slug))
    .filter((s): s is LocalStoryArticle => Boolean(s));

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="pt-32 md:pt-40 pb-14 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>{destination.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display font-bold text-[2rem] md:text-[2.8rem] leading-[1.12] tracking-[-0.01em] text-[color:var(--charcoal)]">
            {destination.h1}
          </h1>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl mx-auto">
            {destination.standfirst}
          </p>
          <div className="mt-10">
            <CtaPair>
              <CtaButton to="/studio-v3" variant="primary">
                Design a private day here
              </CtaButton>
              <CtaButton to="/multi-day" variant="ghost">
                Include it in a full journey
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </header>

      {/* Hero image — real, region-specific, never stock */}
      <section className="bg-[color:var(--sand)] pb-14 md:pb-20">
        <div className="container-x max-w-5xl">
          <figure className="editorial-zoom overflow-hidden rounded-sm">
            <img
              src={destination.hero.src}
              alt={destination.hero.alt}
              loading="eager"
              decoding="async"
              className="w-full aspect-[16/9] object-cover"
            />
          </figure>
        </div>
      </section>

      {/* Editorial sections */}
      <section className="reveal py-20 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x max-w-2xl">
          <div className="space-y-12">
            {destination.sections.map((s) => (
              <div key={s.heading}>
                <h2 className="serif text-[1.6rem] md:text-[1.9rem] leading-tight text-[color:var(--charcoal)]">
                  {s.heading}
                </h2>
                <p className="mt-4 text-[color:var(--charcoal-soft)] leading-[1.8]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial gallery strip */}
      {destination.gallery.length > 0 && (
        <section className="reveal py-14 md:py-20 bg-[color:var(--ivory)] border-t border-[color:var(--border)]">
          <div className="container-x">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {destination.gallery.slice(0, 3).map((p) => (
                <figure key={p.src} className="editorial-zoom overflow-hidden rounded-sm">
                  <img
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/5] md:aspect-[3/4] object-cover"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* Featured Signature tours */}
      <RelatedExperiencesRail
        tours={tours}
        stories={stories}
        toursEyebrow={`Signature days in ${destination.h1.replace(/^Planning a Private Trip to /, "")}`}
        toursTitle={
          <>
            The private days we <SectionTitle.Em>already run here</SectionTitle.Em>
          </>
        }
        storiesEyebrow="Read before you plan"
        background="ivory"
      />

      {/* FAQ */}
      {destination.faq.length > 0 && (
        <section className="reveal py-20 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl">
            <Eyebrow flank>Frequently asked</Eyebrow>
            <SectionTitle as="h2" spacing="loose">
              Planning your <SectionTitle.Em>trip here</SectionTitle.Em>
            </SectionTitle>
            <dl className="mt-10 space-y-8">
              {destination.faq.map((f) => (
                <div key={f.q} className="border-t border-[color:var(--gold-soft)]/40 pt-5">
                  <dt className="serif text-[19px] text-[color:var(--charcoal)]">{f.q}</dt>
                  <dd className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
