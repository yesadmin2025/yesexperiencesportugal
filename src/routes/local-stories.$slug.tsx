import type React from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import {
  jsonLdScript,
  breadcrumbLd,
  personFounderLd,
  localStoryArticleLd,
  faqPageLd,
  regionDestinationLd,
} from "@/lib/jsonld";
import { PLANNER_REGIONS } from "@/content/portugal-planner-map";
import { getLocalStoryArticle, type LocalStoryArticle } from "@/content/local-stories-articles";
import { GuideNextSteps, useGuideLinkTracker } from "@/components/journal/GuideNextSteps";
import { guideRefSearch } from "@/lib/guide-attribution";

/**
 * Static Local Stories are editorial pages first. Their primary content,
 * metadata and internal links stay in the route bundle; database-only work is
 * loaded only for a slug that is not part of the static editorial catalogue.
 * This keeps Supabase and review/runtime dependencies out of the critical path
 * for the stories that receive organic traffic.
 */

function renderBodyWithTourLinks(text: string): React.ReactNode[] {
  const re = /\[([^\]]+)\]\(\/tours\/([a-z0-9-]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <Link
        key={`tl-${key++}`}
        to="/tours/$tourId"
        params={{ tourId: m[2] }}
        className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors"
      >
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

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
  // Dynamic import is intentional: static SEO stories never need the database,
  // so they should not pull the Supabase client into their initial route chunk.
  const { supabase } = await import("@/integrations/supabase/client");
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

function articleImageUrl(article: LocalStoryArticle): string | undefined {
  if (!article.heroImage) return undefined;
  return article.heroImage.startsWith("http") ? article.heroImage : `${BASE}${article.heroImage}`;
}

type LoaderData = {
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
    if (article) return { dbPost: null };

    let post: JournalPostFull | null = null;
    try {
      post = await fetchPost(params.slug);
    } catch {
      post = null;
    }
    if (!post) throw notFound();

    return {
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
  },

  head: ({ params, loaderData }) => {
    const article = getLocalStoryArticle(params.slug);

    if (article) {
      const url = `${BASE}/local-stories/${params.slug}`;
      const imageUrl = articleImageUrl(article);
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
        links: [{ rel: "canonical", href: url }],
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
          jsonLdScript(
            breadcrumbLd([
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
              { name: article.h1, path: `/local-stories/${article.slug}` },
            ]),
          ),
          ...(article.faq && article.faq.length > 0 ? [jsonLdScript(faqPageLd(article.faq))] : []),
          ...(article.plannerRegionIds && article.plannerRegionIds.length > 0
            ? [
                jsonLdScript(
                  regionDestinationLd({
                    slug: article.slug,
                    name: article.h1,
                    description: article.metaDescription,
                    places: PLANNER_REGIONS.filter((region) =>
                      article.plannerRegionIds!.includes(region.id),
                    ).map((region) => ({ label: region.label, lat: region.lat, lon: region.lon })),
                  }),
                ),
              ]
            : []),
        ],
      };
    }

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
    const description = post.excerpt ?? `A local story from Portugal · ${params.slug}`;
    return {
      meta: [
        { title: post.title },
        { name: "description", content: description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(post.heroImage ? [{ property: "og:image", content: post.heroImage }] : []),
        ...(post.publishedAt
          ? [{ property: "article:published_time", content: post.publishedAt }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript(
          localStoryArticleLd({
            slug: post.slug,
            headline: post.title,
            name: post.title,
            description: post.excerpt ?? undefined,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            imageUrl: post.heroImage,
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
      ],
    };
  },

  beforeLoad: ({ params }) => {
    const raw = params.slug ?? "";
    const slug = raw.trim().toLowerCase();
    const placeholders = new Set(["", "slug", "undefined", "null", "example"]);
    const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2;
    if (placeholders.has(slug) || slug.startsWith("$") || !validSlug) throw notFound();
    return undefined as never;
  },

  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
  component: Page,
});

function Page() {
  useMarketingMotion();
  const { slug } = Route.useParams();
  const article = getLocalStoryArticle(slug);
  const loaderData = Route.useLoaderData();

  if (article) return <StaticArticleView article={article} />;

  const post = loaderData?.dbPost;
  if (!post) throw notFound();
  return <DbPostView post={post} />;
}

function StaticArticleView({ article }: { article: LocalStoryArticle }) {
  const trackGuideLink = useGuideLinkTracker(article.slug);

  return (
    <SiteLayout>
      <article className="local-stories-scope">
        <header className="pt-32 md:pt-40 pb-10 bg-[color:var(--sand)]">
          <SiteBreadcrumbs
            containerClassName="container-x max-w-3xl"
            className="bg-transparent pt-0 pb-6"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
              { name: article.h1, path: `/local-stories/${article.slug}` },
            ]}
          />
          <div className="container-x max-w-3xl text-center">
            <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-5">
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
          <div className="container-x prose-longform">
            <div className="prose-yes">
              {article.sections.map((section, index) => (
                <div key={index} className="mb-12">
                  <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.6rem] leading-[1.25] text-[color:var(--charcoal)] mb-5">
                    {section.heading}
                  </h2>
                  <p className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]">
                    {renderBodyWithTourLinks(section.body)}
                  </p>
                </div>
              ))}
            </div>

            {article.comparison && article.comparison.rows.length > 0 && (
              <section
                aria-label={article.comparison.caption}
                className="mt-4 mb-12 reveal"
                data-testid="local-story-comparison"
              >
                <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-5">
                  {article.comparison.caption}
                </span>
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                  <table className="w-full min-w-[520px] border-collapse text-left text-[14px] md:text-[15px]">
                    <thead>
                      <tr>
                        {article.comparison.columns.map((column) => (
                          <th
                            key={column}
                            scope="col"
                            className="border-b border-[color:var(--gold-soft)]/60 py-3 pr-4 font-sans text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {article.comparison.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={`border-b border-[color:var(--sand)] py-3 pr-4 align-top leading-[1.6] text-[color:var(--charcoal)] ${cellIndex === 0 ? "font-medium" : ""}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {article.faq && article.faq.length > 0 && (
              <section
                aria-label="Frequently asked questions"
                className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 reveal"
              >
                <span className="block text-center font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-8">
                  Frequently asked
                </span>
                <dl className="space-y-8">
                  {article.faq.map((item, index) => (
                    <div key={index}>
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

            <GuideNextSteps article={article} />

            <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
              <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-4">
                Travel this story
              </span>
              <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-6 max-w-xl mx-auto leading-[1.75]">
                {article.ctaLead}
              </p>
              {article.signatureSlug ? (
                <>
                  <CtaButton
                    to="/tours/$tourId"
                    params={{ tourId: article.signatureSlug }}
                    search={guideRefSearch(article.slug, "article_cta")}
                    variant="primary"
                    onClick={trackGuideLink(
                      "article_cta",
                      "signature",
                      `/tours/${article.signatureSlug}`,
                    )}
                  >
                    {article.ctaLabel}
                  </CtaButton>
                  <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)] leading-[1.7]">
                    Or{" "}
                    <Link
                      to="/studio-v3"
                      search={guideRefSearch(article.slug, "article_studio")}
                      onClick={trackGuideLink("article_studio", "studio", "/studio-v3")}
                      className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors"
                    >
                      design your own private Portugal day in the Studio
                    </Link>
                    .
                  </p>
                </>
              ) : (
                <>
                  <CtaButton
                    to="/contact"
                    search={{
                      type: "multi_day",
                      place: article.h1,
                      ...guideRefSearch(article.slug, "article_cta"),
                    }}
                    variant="primary"
                    onClick={trackGuideLink("article_cta", "contact", "/contact")}
                  >
                    {article.ctaLabel}
                  </CtaButton>
                  <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)] leading-[1.7]">
                    A local designer reads every request and replies personally, usually within a few hours.
                  </p>
                </>
              )}

              {article.relatedSignatures && article.relatedSignatures.length > 0 && (
                <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                  {article.relatedSignatures.map((related) => (
                    <li key={related.slug}>
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: related.slug }}
                        search={guideRefSearch(article.slug, "related_signature")}
                        onClick={trackGuideLink(
                          "related_signature",
                          "signature",
                          `/tours/${related.slug}`,
                        )}
                        className="hover:text-[color:var(--teal)] transition-colors"
                      >
                        {related.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {article.relatedReads && article.relatedReads.length > 0 && (
                <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] tracking-[0.02em] text-[color:var(--charcoal-soft)]">
                  {article.relatedReads.map((related) => (
                    <li key={related.path}>
                      <a
                        href={`${related.path}?ref=guide:${article.slug}&ref_slot=related_read`}
                        onClick={trackGuideLink("related_read", "guide", related.path)}
                        className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors"
                      >
                        {related.label} →
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <nav className="mt-16 text-center">
              <Link
                to="/local-stories"
                className="inline-flex min-h-[44px] items-center font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)] transition-colors"
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

function DbPostView({ post }: { post: NonNullable<LoaderData["dbPost"]> }) {
  const paragraphs = post.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <SiteLayout>
      <article>
        <header className="pt-32 md:pt-40 pb-10 bg-[color:var(--sand)]">
          <SiteBreadcrumbs
            containerClassName="container-x max-w-3xl"
            className="bg-transparent pt-0 pb-6"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
              { name: post.title, path: `/local-stories/${post.slug}` },
            ]}
          />
          <div className="container-x max-w-3xl text-center">
            {post.region && (
              <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-5">
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
              <div className="aspect-[16/9] overflow-hidden bg-[color:var(--sand)]">
                <img
                  src={post.heroImage}
                  alt={post.heroImageAlt ?? post.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
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
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85] mb-6"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {post.signatureSlug && (
              <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
                <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-4">
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
                className="inline-flex min-h-[44px] items-center font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)] transition-colors"
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
      <section className="py-32 text-center bg-[color:var(--ivory)] reveal">
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
      <section className="py-32 text-center bg-[color:var(--ivory)] reveal">
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
            className="inline-flex min-h-[44px] items-center font-sans text-[13px] uppercase tracking-[0.24em] text-[color:var(--teal)]"
          >
            Try again
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}
