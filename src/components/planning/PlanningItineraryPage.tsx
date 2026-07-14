import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";
import { RelatedExperiencesRail } from "@/components/RelatedExperiencesRail";
import {
  rankRelatedTours,
  seedFromTour,
} from "@/lib/related-experiences";
import { findTour } from "@/data/signatureTours";
import {
  LOCAL_STORIES_ARTICLES,
  type LocalStoryArticle,
} from "@/content/local-stories-articles";
import type { PlanningItinerary } from "@/content/planning/itineraries";

interface Props {
  itinerary: PlanningItinerary;
}

export function PlanningItineraryPage({ itinerary }: Props) {
  const featuredTours = itinerary.relatedSignatureIds
    .map((id) => findTour(id))
    .filter((t): t is NonNullable<ReturnType<typeof findTour>> => Boolean(t));

  const relatedTours = featuredTours[0]
    ? rankRelatedTours(seedFromTour(featuredTours[0]), 3)
    : featuredTours.slice(0, 3);

  const stories = itinerary.relatedStorySlugs
    .map((slug) => LOCAL_STORIES_ARTICLES.find((s) => s.slug === slug))
    .filter((s): s is LocalStoryArticle => Boolean(s));

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="pt-32 md:pt-40 pb-14 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>{itinerary.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display font-bold text-[2rem] md:text-[2.8rem] leading-[1.12] tracking-[-0.01em] text-[color:var(--charcoal)]">
            {itinerary.h1}
          </h1>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl mx-auto">
            {itinerary.standfirst}
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-[color:var(--gold-warm)]">
            {itinerary.spanLabel}
          </p>
          <div className="mt-10">
            <CtaPair>
              <CtaButton to="/multi-day" variant="primary">
                Compose this with a designer
              </CtaButton>
              <CtaButton to="/studio-v3" variant="ghost">
                Design a private day
              </CtaButton>
            </CtaPair>
          </div>
        </div>
      </header>

      {/* Day-by-day */}
      <section className="reveal py-20 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>Day-by-day shape</Eyebrow>
          <SectionTitle as="h2" spacing="loose">
            The <SectionTitle.Em>rhythm of the journey</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            Your designer swaps, stretches or removes days so the pace fits your group. Nothing
            below is a package — every day already exists in our real Signature catalog.
          </p>

          <ol className="mt-10 space-y-8">
            {itinerary.days.map((d) => (
              <li key={d.span} className="border-t border-[color:var(--border)] pt-6">
                <div className="text-[11px] tracking-[0.22em] uppercase text-[color:var(--charcoal)]">
                  {d.span} · {d.eyebrow}
                </div>
                <h3 className="serif text-[22px] md:text-[24px] mt-2 leading-snug text-[color:var(--charcoal)]">
                  {d.title}
                </h3>
                <p className="mt-3 text-[color:var(--charcoal-soft)] leading-relaxed">{d.body}</p>
                {d.signatureIds && d.signatureIds.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] uppercase tracking-[0.22em]">
                    {d.signatureIds
                      .map((id) => findTour(id))
                      .filter((t): t is NonNullable<ReturnType<typeof findTour>> => Boolean(t))
                      .map((t) => (
                        <li key={t.id}>
                          <Link
                            to="/tours/$tourId"
                            params={{ tourId: t.id }}
                            className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
                          >
                            {t.title.split(" — ")[0]} →
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <p className="mt-12 text-[color:var(--charcoal-soft)] leading-relaxed italic">
            {itinerary.outro}
          </p>
        </div>
      </section>

      {/* Related lane */}
      <RelatedExperiencesRail
        tours={relatedTours}
        stories={stories}
        toursEyebrow="Experiences inside this journey"
        toursTitle={
          <>
            Signature days your <SectionTitle.Em>designer draws from</SectionTitle.Em>
          </>
        }
        storiesEyebrow="Read before you plan"
        background="ivory"
      />

      {/* FAQ */}
      {itinerary.faq.length > 0 && (
        <section className="reveal py-20 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl">
            <Eyebrow flank>Frequently asked</Eyebrow>
            <SectionTitle as="h2" spacing="loose">
              About <SectionTitle.Em>this itinerary</SectionTitle.Em>
            </SectionTitle>
            <dl className="mt-10 space-y-8">
              {itinerary.faq.map((f) => (
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

      {/* Outro CTA */}
      <section className="reveal py-16 bg-[color:var(--ivory)] border-t border-[color:var(--border)]">
        <div className="container-x max-w-2xl text-center">
          <SectionTitle as="h2" size="compact">
            Compose the real days <SectionTitle.Em>with a designer</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            The itinerary above is a shape. Your Travel Designer builds the real one — hotels,
            timings, tables — around your rhythm.
          </p>
          <div className="mt-8">
            <CtaButton to="/multi-day">Start composing your journey</CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
