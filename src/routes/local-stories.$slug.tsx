import { createFileRoute, Link, notFound, useRouter, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CtaButton } from "@/components/ui/CtaButton";
import {
  jsonLdScript,
  breadcrumbLd,
  FOUNDER_ID,
  personFounderLd,
  localStoryReviewsLd,
  type LocalStoryReviewInput,
} from "@/lib/jsonld";
import { getTourReviews } from "@/lib/reviews.functions";
import { findTour } from "@/data/signatureTours";
import {
  getLocalStoryArticle,
  type LocalStoryArticle,
} from "@/content/local-stories-articles";

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

function articleJsonLd(a: LocalStoryArticle) {
  const url = `${BASE}/local-stories/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.h1,
    name: a.title,
    description: a.metaDescription,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished: a.datePublished,
    dateModified: a.datePublished,
    inLanguage: "en",
    author: {
      "@type": "Person",
      "@id": FOUNDER_ID,
      name: "Nidia Almeida",
      url: `${BASE}/about`,
      sameAs: ["https://www.linkedin.com/in/nidiadealmeida"],
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "YES Experiences Portugal",
      url: BASE,
      logo: {
        "@type": "ImageObject",
        url: `${BASE}/brand/png/yes-experiences-portugal-centered-full@2x.png`,
      },
    },
  };
}

type LoaderData = {
  reviews: LocalStoryReviewInput[];
  signatureTitle: string | null;
};

export const Route = createFileRoute("/local-stories/$slug")({
  loader: async ({ params }): Promise<LoaderData> => {
    const article = getLocalStoryArticle(params.slug);
    if (!article) return { reviews: [], signatureTitle: null };
    const tour = findTour(article.signatureSlug);
    if (!tour) return { reviews: [], signatureTitle: null };
    try {
      const rows = await getTourReviews({
        data: { tourId: article.signatureSlug, limit: 3 },
      });
      const reviews = (rows ?? [])
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
      return { reviews, signatureTitle: tour.title };
    } catch {
      return { reviews: [], signatureTitle: tour.title };
    }
  },

  head: ({ params, loaderData }) => {
    const article = getLocalStoryArticle(params.slug);

    // The day-trips guide now lives at its dedicated SEO route.
    if (article && article.slug === "best-day-trips-from-lisbon") {
      const canonicalUrl = `${BASE}/day-trips-from-lisbon`;
      return {
        meta: [
          { title: article.title },
          { name: "description", content: article.metaDescription },
          { property: "og:title", content: article.title },
          { property: "og:description", content: article.metaDescription },
          { property: "og:url", content: canonicalUrl },
          { property: "og:type", content: "article" },
          { property: "article:published_time", content: article.datePublished },
        ],
        links: [{ rel: "canonical", href: canonicalUrl }],
      };
    }

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
      return {
        meta: [
          { title: article.title },
          { name: "description", content: article.metaDescription },
          { property: "og:title", content: article.title },
          { property: "og:description", content: article.metaDescription },
          { property: "og:url", content: url },
          { property: "og:type", content: "article" },
          { property: "article:published_time", content: article.datePublished },
        ],
        links: [{ rel: "canonical", href: url }],
        scripts: [
          jsonLdScript(articleJsonLd(article)),
          jsonLdScript(personFounderLd()),
          jsonLdScript(
            breadcrumbLd([
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
              { name: article.h1, path: `/local-stories/${article.slug}` },
            ]),
          ),
          ...reviewScripts,
        ],
      };
    }

    const url = `${BASE}/local-stories/${params.slug}`;
    return {
      meta: [
        { title: `Local Story — YES experiences Portugal` },
        {
          name: "description",
          content: `A local story from Portugal · ${params.slug}`,
        },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  beforeLoad: ({ params }) => {
    // The day-trips guide now lives at its own SEO-focused route.
    if (params.slug === "best-day-trips-from-lisbon") {
      throw redirect({ to: "/day-trips-from-lisbon" });
    }
  },

  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const article = getLocalStoryArticle(slug);

  // Static SEO articles render directly (no DB needed).
  if (article) {
    return <StaticArticleView article={article} />;
  }

  return <DbPostView slug={slug} />;
}

function StaticArticleView({ article }: { article: LocalStoryArticle }) {
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

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-2xl">
            <div className="prose-yes">
              {article.sections.map((s, i) => (
                <div key={i} className="mb-12">
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.6rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {s.heading}
                  </h2>
                  <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

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
    </SiteLayout>
  );
}

function DbPostView({ slug }: { slug: string }) {
  const { data: post, isLoading } = useQuery({
    queryKey: ["journal_post", slug],
    queryFn: () => fetchPost(slug),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <section className="pt-40 pb-32 bg-[color:var(--ivory)] text-center">
          <p className="font-serif italic text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!post) {
    throw notFound();
  }

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
            {post.author_name && (
              <p className="mt-6 text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                By {post.author_name}
              </p>
            )}
          </div>
          {post.hero_image_url && (
            <div className="container-x max-w-4xl mt-10">
              <div className="relative overflow-hidden aspect-[16/9] shadow-[0_24px_60px_-30px_rgba(46,46,46,0.4)]">
                <img
                  src={post.hero_image_url}
                  alt={post.hero_image_alt ?? post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </header>

        <section className="py-20 md:py-28 bg-[color:var(--ivory)]">
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

            {post.signature_slug && (
              <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
                <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                  Travel this story
                </span>
                <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-6">
                  The places in this piece live inside one of our private days.
                </p>
                <CtaButton
                  to="/tours/$tourId"
                  params={{ tourId: post.signature_slug }}
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
    </SiteLayout>
  );
}

function NotFoundView() {
  return (
    <SiteLayout>
      <section className="py-32 text-center bg-[color:var(--ivory)]">
        <div className="container-x max-w-xl">
          <h1 className="font-display text-[1.8rem] text-[color:var(--charcoal)] mb-4">
            Story not found
          </h1>
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
      <section className="py-32 text-center bg-[color:var(--ivory)]">
        <div className="container-x max-w-xl">
          <h1 className="font-display text-[1.6rem] text-[color:var(--charcoal)] mb-4">
            Something went off route
          </h1>
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
