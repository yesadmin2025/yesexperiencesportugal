import type React from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";


import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  jsonLdScript,
  breadcrumbLd,
  personFounderLd,
  localStoryReviewsLd,
  localStoryArticleLd,
  normalizeLocalStoryReviews,
  faqPageLd,
  tourProductLd,
  hreflangUsCaLinks,
  organizationUsCaAudienceLd,
  type NormalizedLocalStoryReview,
} from "@/lib/jsonld";
import { withAggregateAndReviews } from "@/lib/aggregate-review-schema";
import { getViatorMeta } from "@/data/signatureToursViator";
import LandingTourCredibility from "@/components/LandingTourCredibility";

import { getTourReviews } from "@/lib/reviews.functions";
import { findTour } from "@/data/signatureTours";
import { getLocalStoryArticle, type LocalStoryArticle } from "@/content/local-stories-articles";
import { RelatedExperiencesRail } from "@/components/RelatedExperiencesRail";
import StoryInternalLinks from "@/components/story/StoryInternalLinks";
import { rankRelatedTours, relatedStoriesForStory } from "@/lib/related-experiences";

type JournalPostFull = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  region: string | null;
  author_name: string | null;
  signature_slug: string | null;
  published_at: string | null;
};

async function fetchPost(slug: string): Promise<JournalPostFull | null> {
  const { data, error } = await supabase
    .from("journal_posts")
    .select(
      "slug,title,excerpt,body,hero_image_url,hero_image_alt,region,author_name,signature_slug,published_at",
    )
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as JournalPostFull | null;
}

const BASE = "https://yesexperiencesportugal.com";

/** Absolute URL for a Signature tour's hero image, when the article
 *  doesn't ship its own hero. Bundled imports resolve to root-relative
 *  URLs like `/assets/xxx.jpg`; we prefix with BASE for JSON-LD/OG. */
function articleImageUrl(a: LocalStoryArticle): string | undefined {
  if (a.heroImage) {
    return a.heroImage.startsWith("http") ? a.heroImage : `${BASE}${a.heroImage}`;
  }
  const tour = findTour(a.signatureSlug);
  const img = tour?.img;
  if (!img) return undefined;
  return img.startsWith("http") ? img : `${BASE}${img.startsWith("/") ? "" : "/"}${img}`;
}


type LoaderData = {
  reviews: NormalizedLocalStoryReview[];
  signatureTitle: string | null;
  dbPost: {
    slug: string;
    title: string;
    excerpt: string | null;
    body: string;
    heroImage: string | null;
    heroImageAlt: string | null;
    region: string | null;
    authorName: string | null;
    signatureSlug: string | null;
    publishedAt: string | null;
  } | null;
};

export const Route = createFileRoute("/local-stories/$slug")({
  loader: async ({ params }): Promise<LoaderData> => {
    const article = getLocalStoryArticle(params.slug);
    if (!article) {
      // No static article — try DB post. If neither exists, this URL
      // is not a real story: throw notFound() so the response is a real
      // 404 with noindex, not a soft-404 200.
      let post: JournalPostFull | null = null;
      try {
        post = await fetchPost(params.slug);
      } catch {
        // Treat DB errors as "unknown" — fall through to notFound below.
        post = null;
      }
      if (!post) throw notFound();
      return {
        reviews: [],
        signatureTitle: null,
        dbPost: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          heroImage: post.hero_image_url,
          heroImageAlt: post.hero_image_alt,
          region: post.region,
          authorName: post.author_name,
          signatureSlug: post.signature_slug,
          publishedAt: post.published_at,
        },
      };
    }
    const tour = findTour(article.signatureSlug);
    if (!tour) return { reviews: [], signatureTitle: null, dbPost: null };
    try {
      const rows = await getTourReviews({
        data: { tourId: article.signatureSlug, limit: 3 },
      });
      const filtered = (rows ?? [])
        .filter((r) => r.is_first_party && r.rating >= 4 && !!r.body)
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          rating: Number(r.rating),
          body: r.body,
          title: r.title,
          reviewer_name: r.reviewer_name,
          reviewer_country: r.reviewer_country,
          published_at: r.published_at,
        }));
      // Single normalization step — visible UI and JSON-LD consume the
      // same shape so fields cannot drift.
      const reviews = normalizeLocalStoryReviews(filtered);
      return { reviews, signatureTitle: tour.title, dbPost: null };
    } catch {
      return { reviews: [], signatureTitle: tour.title, dbPost: null };
    }
  },

  head: ({ params, loaderData }) => {
    const article = getLocalStoryArticle(params.slug);

    // Every Local Story is self-canonical at /local-stories/<slug>.


    if (article) {
      const url = `${BASE}/local-stories/${params.slug}`;
      const reviews = loaderData?.reviews ?? [];
      const signatureTitle = loaderData?.signatureTitle ?? article.ctaLabel;
      const reviewScripts =
        reviews.length > 0
          ? localStoryReviewsLd({
              signatureSlug: article.signatureSlug,
              signatureTitle,
              reviews,
            }).map((node) => jsonLdScript(node))
          : [];
      const imageUrl = articleImageUrl(article);
      const tour = findTour(article.signatureSlug);
      const viator = getViatorMeta(article.signatureSlug);
      const productScript =
        tour && viator && viator.reviewCount > 0
          ? [
              jsonLdScript(
                withAggregateAndReviews(
                  tourProductLd({
                    id: tour.id,
                    title: tour.title,
                    blurb: tour.blurb,
                    img: imageUrl ?? tour.img,
                    priceFrom: tour.priceFrom,
                    currency: "EUR",
                    region: tour.region,
                    durationHours: tour.durationHours,
                  }),
                  article.signatureSlug,
                ),
              ),
            ]
          : [];
      return {
        meta: [
          { title: article.title },
          { name: "description", content: article.metaDescription },
          { property: "og:title", content: article.title },
          { property: "og:description", content: article.metaDescription },
          { property: "og:url", content: url },
          { property: "og:type", content: "article" },
          ...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
          ...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
          { property: "article:published_time", content: article.datePublished },
          ...(article.dateModified
            ? [{ property: "article:modified_time", content: article.dateModified }]
            : []),
        ],
        links: [
          { rel: "canonical", href: url },
          ...hreflangUsCaLinks(`/local-stories/${params.slug}`),
        ],
        scripts: [
          jsonLdScript(
            localStoryArticleLd({
              slug: article.slug,
              headline: article.h1,
              name: article.title,
              description: article.metaDescription,
              datePublished: article.datePublished,
              dateModified: article.dateModified,
              imageUrl,
            }),
          ),
          jsonLdScript(personFounderLd()),
          jsonLdScript(organizationUsCaAudienceLd()),
          jsonLdScript(
            breadcrumbLd([
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
              { name: article.h1, path: `/local-stories/${article.slug}` },
            ]),
          ),
          ...(article.faq && article.faq.length > 0 ? [jsonLdScript(faqPageLd(article.faq))] : []),
          ...productScript,
          ...reviewScripts,
        ],
      };
    }


    // No static article and no matching DB post — the loader threw
    // notFound() (or errored). Emit a minimal noindex head so this URL
    // never gets indexed, and never advertise a canonical for it.
    const post = loaderData?.dbPost ?? null;
    if (!post) {
      return {
        meta: [
          { title: "Story not found — YES Experiences Portugal" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    const url = `${BASE}/local-stories/${params.slug}`;
    const title = post.title;
    const description = post.excerpt ?? `A local story from Portugal · ${params.slug}`;
    const heroImage = post.heroImage ?? null;

    const scripts = [
      jsonLdScript(
        localStoryArticleLd({
          slug: post.slug,
          headline: post.title,
          name: post.title,
          description: post.excerpt ?? undefined,
          datePublished: post.publishedAt,
          dateModified: post.publishedAt,
          imageUrl: heroImage,
          authorName: post.authorName,
        }),
      ),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Local Stories", path: "/local-stories" },
          { name: post.title, path: `/local-stories/${post.slug}` },
        ]),
      ),
    ];


    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(heroImage ? [{ property: "og:image", content: heroImage }] : []),
        ...(post.publishedAt
          ? [{ property: "article:published_time", content: post.publishedAt }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },

  beforeLoad: ({ params }) => {

    // Placeholder / malformed slugs ($slug, %24slug, undefined, template
    // stubs, anything that can't be a real article) must serve a real 404
    // with noindex — NOT a 301 to the listing. A 301 keeps the URL alive
    // in the index and, because the listing links back into the same
    // /local-stories/* family, Google reports it as a redirect loop.
    const raw = params.slug ?? "";
    const s = raw.trim().toLowerCase();
    const PLACEHOLDERS = new Set(["", "slug", "undefined", "null", "example"]);
    const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2;
    if (PLACEHOLDERS.has(s) || s.startsWith("$") || !validSlug) {
      throw notFound();
    }
    return undefined as never;
  },

  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const article = getLocalStoryArticle(slug);
  const loaderData = Route.useLoaderData();

  // Static SEO articles render directly (no DB needed).
  if (article) {
    return <StaticArticleView article={article} reviews={loaderData?.reviews ?? []} />;
  }

  // Loader guarantees dbPost exists here (else notFound() was thrown).
  const post = loaderData?.dbPost;
  if (!post) throw notFound();
  return <DbPostView post={post} />;
}

function StaticArticleView({
  article,
  reviews,
}: {
  article: LocalStoryArticle;
  reviews: NormalizedLocalStoryReview[];
}) {
  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
  });

  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-10 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5">
              {article.eyebrow}
            </span>
            <h1 className="font-display font-bold text-[2rem] md:text-[2.6rem] leading-[1.15] tracking-[-0.01em] text-[color:var(--charcoal)]">
              {article.h1}
            </h1>
            {article.standfirst && (
              <p className="mt-6 font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)] max-w-2xl mx-auto">
                {article.standfirst}
              </p>
            )}
          </div>
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)] reveal">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              {article.sections.map((s, i) => (
                <div key={i} className="mb-12 reveal-stagger">
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.6rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {s.heading}
                  </h2>
                  <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            {article.faq && article.faq.length > 0 && (
              <section
                aria-label="Frequently asked questions"
                className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 reveal"
              >
                <span className="block text-center font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-8">
                  Frequently asked
                </span>
                <dl className="space-y-8">
                  {article.faq.map((item, i) => (
                    <div key={i}>
                      <dt className="font-display font-semibold text-[1.05rem] md:text-[1.15rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
                        {item.q}
                      </dt>
                      <dd className="text-[15px] md:text-[16px] text-[color:var(--charcoal)] leading-[1.8]">
                        {item.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                Travel this story
              </span>
              <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-6 max-w-xl mx-auto leading-[1.75]">
                {article.ctaLead}
              </p>
              <CtaButton
                to="/tours/$tourId"
                params={{ tourId: article.signatureSlug }}
                variant="primary"
              >
                {article.ctaLabel}
              </CtaButton>

              <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)] leading-[1.7]">
                Or{" "}
                <Link
                  to="/studio-v3"
                  className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors"
                >
                  design your own private Portugal day in the Studio
                </Link>
                .
              </p>

              {article.relatedSignatures && article.relatedSignatures.length > 0 && (
                <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                  {article.relatedSignatures.map((r) => (
                    <li key={r.slug}>
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: r.slug }}
                        className="hover:text-[color:var(--teal)] transition-colors"
                      >
                        {r.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {reviews.length > 0 && (
              <section
                aria-label="Guest notes from this experience"
                className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 reveal"
              >
                <span className="block text-center font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-8">
                  Guest notes
                </span>
                <ul className="space-y-8">
                  {reviews.map((r) => {
                    const bylineParts: React.ReactNode[] = [];
                    if (r.authorName) bylineParts.push(<span key="n">{r.authorName}</span>);
                    if (r.country) bylineParts.push(<span key="c"> · {r.country}</span>);
                    if (r.publishedAt) {
                      bylineParts.push(
                        <span key="d">
                          {" · "}
                          <time dateTime={r.publishedAt}>
                            {dateFmt.format(new Date(r.publishedAt))}
                          </time>
                        </span>,
                      );
                    }
                    return (
                      <li key={r.id} className="border-l-2 border-[color:var(--gold-soft)]/60 pl-5">
                        {r.ratingValue !== null && (
                          <div
                            className="text-[color:var(--gold-warm)] text-[13px] tracking-[0.2em] mb-2"
                            aria-label={`Rated ${r.ratingValue} out of 5`}
                          >
                            {"★".repeat(r.ratingValue)}
                          </div>
                        )}
                        {r.title && (
                          <p className="font-display font-semibold text-[1rem] md:text-[1.05rem] text-[color:var(--charcoal)] mb-2">
                            {r.title}
                          </p>
                        )}
                        <p className="font-serif italic text-[15px] md:text-[16px] leading-[1.7] text-[color:var(--charcoal)]">
                          “{r.body}”
                        </p>
                        {bylineParts.length > 0 && (
                          <p className="mt-3 text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                            {bylineParts}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <nav className="mt-16 text-center">
              <Link
                to="/local-stories"
                className="font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)] transition-colors"
              >
                ← All Local Stories
              </Link>
            </nav>
          </div>
        </section>
      </article>
      <LandingTourCredibility parentTourId={article.signatureSlug} />
      <StoryInternalLinks article={article} />
      <StoryRelated article={article} />
    </SiteLayout>
  );
}

function DbPostView({ post }: { post: NonNullable<LoaderData["dbPost"]> }) {
  const paragraphs = post.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-10 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            {post.region && (
              <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-5">
                {post.region}
              </span>
            )}
            <h1 className="font-display font-bold text-[2rem] md:text-[2.6rem] leading-[1.15] tracking-[-0.01em] text-[color:var(--charcoal)]">
              {post.title}
            </h1>
            {post.authorName && (
              <p className="mt-6 text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                By {post.authorName}
              </p>
            )}
          </div>
          {post.heroImage && (
            <div className="container-x max-w-4xl mt-10">
              <div className="relative overflow-hidden aspect-[16/9] shadow-[0_24px_60px_-30px_rgba(46,46,46,0.4)]">
                <img
                  src={post.heroImage}
                  alt={post.heroImageAlt ?? post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)] reveal">
          <div className="container-x max-w-2xl">
            {post.excerpt && (
              <p className="font-serif italic text-[1.25rem] md:text-[1.4rem] leading-[1.55] text-[color:var(--charcoal)] mb-10 pb-10 border-b border-[color:var(--gold-soft)]/40">
                {post.excerpt}
              </p>
            )}
            <div className="prose-yes">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85] mb-6"
                >
                  {p}
                </p>
              ))}
            </div>

            {post.signatureSlug && (
              <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
                <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                  Travel this story
                </span>
                <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-6">
                  The places in this piece live inside one of our private days.
                </p>
                <CtaButton
                  to="/tours/$tourId"
                  params={{ tourId: post.signatureSlug }}
                  variant="primary"
                >
                  See the Signature
                </CtaButton>
              </aside>
            )}

            <nav className="mt-16 text-center">
              <Link
                to="/local-stories"
                className="font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)] transition-colors"
              >
                ← All Local Stories
              </Link>
            </nav>
          </div>
        </section>
      </article>
      {post.signatureSlug && <DbPostRelated signatureSlug={post.signatureSlug} />}
    </SiteLayout>
  );
}

function StoryRelated({ article }: { article: LocalStoryArticle }) {
  const primary = findTour(article.signatureSlug);
  const tours = primary
    ? rankRelatedTours(
        {
          excludeTourId: primary.id,
          region: primary.region,
          styles: primary.seed?.styles,
          highlights: primary.seed?.highlights,
        },
        3,
      )
    : [];
  const stories = relatedStoriesForStory(article, 3);
  return <RelatedExperiencesRail tours={tours} stories={stories} background="ivory" />;
}

function DbPostRelated({ signatureSlug }: { signatureSlug: string }) {
  const primary = findTour(signatureSlug);
  if (!primary) return null;
  const tours = rankRelatedTours(
    {
      excludeTourId: primary.id,
      region: primary.region,
      styles: primary.seed?.styles,
      highlights: primary.seed?.highlights,
    },
    3,
  );
  return <RelatedExperiencesRail tours={tours} background="ivory" />;
}

function NotFoundView() {
  return (
    <SiteLayout>
      <section className="py-32 text-center bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-xl">
          <h2 className="font-display text-[1.8rem] text-[color:var(--charcoal)] mb-4">
            Story not found
          </h2>

          <p className="text-[color:var(--charcoal-soft)] mb-8">
            This story may have moved or is being written.
          </p>
          <CtaButton to="/local-stories" variant="primary">
            All Local Stories
          </CtaButton>
        </div>
      </section>
    </SiteLayout>
  );
}

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="py-32 text-center bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-xl">
          <h2 className="font-display text-[1.6rem] text-[color:var(--charcoal)] mb-4">
            Something went off route
          </h2>

          <p className="text-[color:var(--charcoal-soft)] mb-8">{error.message}</p>
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--teal)]"
          >
            Try again
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}
