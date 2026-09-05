import { localeAlternateLinks } from "@/i18n/seo";
/**
 * /pt/reviews — Portuguese reviews aggregator.
 * Same data source as /reviews, chrome in European Portuguese.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { getReviewsPageData } from "@/lib/reviews.functions";
import { GuestReviewForm } from "@/components/reviews/GuestReviewForm";

import { SITE_URL } from "@/lib/seo";

import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Cliente verificado",
};

export const Route = createFileRoute("/pt/reviews")({
  component: ReviewsPage,
  // Server-rendered: every card is in the initial HTML.
  loader: async () => getReviewsPageData(),
  head: ({ loaderData }) => {
    const fpCount = loaderData?.global.first_party_count ?? 0;
    const fpAvg = loaderData?.global.first_party_avg ?? null;
    const title = "Avaliações de clientes — Tours privados em Portugal pela YES";
    const description =
      "Avaliações verificadas de clientes no Viator, Tripadvisor, GetYourGuide e submissões diretas para os nossos tours privados a partir de Lisboa.";
    const meta = [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/pt/reviews` },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_PT" },
    ];
    const links = [
      { rel: "canonical", href: `${SITE_URL}/pt/reviews` },
      ...localeAlternateLinks("/reviews"),
    ];
    const scripts: Array<{ type: string; children: string }> = [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/pt` },
            {
              "@type": "ListItem",
              position: 2,
              name: "Avaliações",
              item: `${SITE_URL}/pt/reviews`,
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${SITE_URL}/pt/reviews#collection`,
          name: "YES Experiences Portugal — Avaliações reais de clientes",
          description,
          url: `${SITE_URL}/pt/reviews`,
          inLanguage: "pt-PT",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
          ...(fpCount >= 10 && fpAvg
            ? {
                mainEntity: {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(fpAvg.toFixed(2)),
                    reviewCount: fpCount,
                    bestRating: 5,
                    worstRating: 1,
                  },
                },
              }
            : {}),
        }),
      },
    ];
    return { meta, links, scripts };
  },
});

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[color:var(--gold)]"
      aria-label={`${rating} em 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < Math.round(rating) ? "currentColor" : "none"}
          strokeWidth={i < Math.round(rating) ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

function ReviewsPage() {
  useMarketingMotion();
  const { global, tours } = Route.useLoaderData();

  return (
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Eyebrow flank>Avaliações reais de clientes</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              O que os clientes <SectionTitle.Em>realmente</SectionTitle.Em> dizem.
            </SectionTitle>
            {global.total_reviews >= 25 && (
              <p className="mt-6 font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
                <span className="tabular-nums">{global.total_reviews.toLocaleString("pt-PT")}</span>{" "}
                avaliações
                {global.average_rating && (
                  <>
                    {" "}
                    · <span className="tabular-nums">{global.average_rating.toFixed(1)}</span>★
                  </>
                )}{" "}
                em várias plataformas.
              </p>
            )}
            <p className="mt-4 font-sans text-[12.5px] text-[color:var(--charcoal-soft)]">
              Baseado em avaliações verificadas de clientes nas principais plataformas de reservas.
            </p>
          </div>
        </header>

        <section className="reveal py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-5xl">
            <div className="space-y-16 md:space-y-20">
              {tours.map((b) => {
                const id = b.tour_id;
                return (
                  <article key={id}>
                    <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--gold-soft)]/40 pb-4">
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: id }}
                        className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors"
                      >
                        {b.title}
                      </Link>
                      <div className="font-sans text-[13px] text-[color:var(--charcoal-soft)]">
                        {b.stats.average_rating && (
                          <>
                            <span className="tabular-nums">
                              {b.stats.average_rating.toFixed(1)}
                            </span>
                            ★ ·{" "}
                          </>
                        )}
                        <span className="tabular-nums">{b.stats.total_reviews}</span> avaliações
                      </div>
                    </header>

                    {b.reviews.length > 0 ? (
                      <ul className="mt-6 grid gap-5 md:grid-cols-2 list-none p-0">
                        {b.reviews.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-[2px] border border-[color:var(--gold-soft)]/40 bg-[color:var(--ivory)] p-6"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Stars rating={r.rating} />
                              <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                                {r.is_first_party
                                  ? "Cliente verificado"
                                  : `via ${SOURCE_LABEL[r.source]}`}
                              </span>
                            </div>
                            {r.title && (
                              <p className="mt-3 font-display font-semibold text-[15px] text-[color:var(--charcoal)]">
                                {r.title}
                              </p>
                            )}
                            <p className="mt-2 text-[14px] text-[color:var(--charcoal)] leading-[1.75]">
                              {r.body}
                            </p>
                            <p className="mt-3 font-sans text-[12px] text-[color:var(--charcoal-soft)]">
                              {r.reviewer_name ?? "Cliente"}
                              {r.reviewer_country ? ` · ${r.reviewer_country}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-5 font-sans text-[13px] text-[color:var(--charcoal-soft)]">
                        Os dados agregados acima são verificados a partir da listagem da plataforma.
                        Citações selecionadas aparecerão aqui à medida que os clientes as submetem.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            <GuestReviewForm
              locale="pt"
              tours={tours.map((t) => ({ tour_id: t.tour_id, title: t.title }))}
            />

            <aside className="mt-20 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">

              <CtaButton to="/pt/experiences" variant="primary">
                Ver todas as experiências Signature
              </CtaButton>
            </aside>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
