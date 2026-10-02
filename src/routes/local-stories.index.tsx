import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { PUBLISHED_LOCAL_STORIES_ARTICLES as LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import ogImg from "@/assets/edit-viewpoint.jpg";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

// Database-authored posts are secondary to the static editorial catalogue.
// Keeping this behind a route-level chunk means React Query + Supabase do not
// sit in the critical JS path for the Local Stories landing page.
const DeferredJournalPosts = lazy(() => import("@/components/journal/DeferredJournalPosts"));

export const Route = createFileRoute("/local-stories/")({
  head: () => ({
    meta: [
      { title: "Portugal Travel Guides & Local Stories — Written in Portugal" },
      {
        name: "description",
        content:
          "Local guides to Portugal’s wine regions, private day trips, hidden places and travel planning, written by the team who designs the experiences.",
      },
      { property: "og:title", content: "Portugal Travel Guides & Local Stories — Written in Portugal" },
      {
        property: "og:description",
        content: "Guides to Portugal’s wine regions, day trips and hidden places, written by the locals who design our private experiences.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/local-stories" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Local Stories — notes from the road by YES designers" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/local-stories" }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Local Stories", path: "/local-stories" },
        ]),
      ),
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": "https://yesexperiencesportugal.com/local-stories#blog",
        url: "https://yesexperiencesportugal.com/local-stories",
        name: "Portugal Travel Guides & Local Stories — Written in Portugal",
        description:
          "Notes from the road, written by the locals who design our private Portugal experiences.",
        inLanguage: "en",
        isPartOf: { "@id": "https://yesexperiencesportugal.com/#website" },
        publisher: { "@id": "https://yesexperiencesportugal.com/#organization" },
        blogPost: LOCAL_STORIES_ARTICLES.map((article) => ({
          "@type": "BlogPosting",
          headline: article.h1,
          name: article.title,
          description: article.metaDescription,
          url: `https://yesexperiencesportugal.com/local-stories/${article.slug}`,
          datePublished: article.datePublished,
        })),
      }),
    ],
  }),
  component: Page,
});

function Page() {
  useMarketingMotion();
  const featuredComporta = LOCAL_STORIES_ARTICLES.find((article) => article.slug === "troia-comporta-guide");
  const staticSlugs = LOCAL_STORIES_ARTICLES.map((article) => article.slug);
  // Only cluster closely related readings. A shared tour reference alone does
  // not mean two articles have the same editorial subject.
  const relatedReading: Record<string, string> = {
    "arrabida-wine-tour-what-to-expect": "arrabida-wine-tour-from-lisbon",
    "arrabida-day-trip-from-lisbon": "arrabida-wine-tour-from-lisbon",
  };
  const storyGroups = Array.from(
    LOCAL_STORIES_ARTICLES.filter((article) => article.slug !== "troia-comporta-guide").reduce((groups, article) => {
      const key = relatedReading[article.slug] ?? article.slug;
      const group = groups.get(key) ?? [];
      group.push(article);
      groups.set(key, group);
      return groups;
    }, new Map<string, typeof LOCAL_STORIES_ARTICLES>()),
  ).map(([, articles]) => articles.sort((a, b) => Number(Boolean(relatedReading[a.slug])) - Number(Boolean(relatedReading[b.slug]))));
  const regionalGroups = storyGroups.filter(([article]) => !article.signatureSlug);
  const experienceGroups = storyGroups.filter(([article]) => Boolean(article.signatureSlug));

  const renderStories = (groups: typeof storyGroups) => (
    <div className="grid gap-x-16 gap-y-12 md:grid-cols-2 md:gap-y-16">
      {groups.map(([lead, ...related]) => (
        <article key={lead.slug} className="reveal-stagger border-t border-[color:var(--gold-soft)]/60 pt-7 md:pt-8">
          <Link
            to="/local-stories/$slug"
            params={{ slug: lead.slug }}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
          >
            <span className="block font-sans text-[11px] uppercase tracking-[0.17em] text-[color:var(--gold-ink)] mb-4">
              {lead.eyebrow}
            </span>
            <h3 className="mb-4 font-serif text-[26px] leading-[1.22] text-[color:var(--charcoal)] transition-colors duration-300 group-hover:text-[color:var(--teal)] md:text-[28px]">
              {lead.h1}
            </h3>
            <p className="text-[16px] text-[color:var(--charcoal-soft)] leading-[1.7] max-w-[52ch]">
              {lead.standfirst}
            </p>
            <span className="mt-5 inline-flex min-h-[44px] items-center font-sans text-[12px] uppercase tracking-[0.17em] text-[color:var(--teal)]">
              Read the story →
            </span>
          </Link>
          {related.length > 0 && (
            <div className="mt-5 border-t border-[color:var(--gold-soft)]/40 pt-5">
              <span className="font-sans text-[11px] uppercase tracking-[0.17em] text-[color:var(--gold-ink)]">
                More local reading
              </span>
              <ul className="mt-2">
                {related.map((article) => (
                  <li key={article.slug}>
                    <Link
                      to="/local-stories/$slug"
                      params={{ slug: article.slug }}
                      className="inline-flex min-h-[44px] items-center text-[15px] leading-[1.45] text-[color:var(--teal)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    >
                      {article.h1} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
    </div>
  );

  return (
    <SiteLayout>
      <section className="page-hero public-page-header text-center">
        <div className="container-x">
          <SiteBreadcrumbs
            containerClassName=""
            className="bg-transparent pt-0 pb-6 text-left"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Local Stories", path: "/local-stories" },
            ]}
          />
          <div className="scene-atmosphere">
            <Eyebrow flank>Local Stories</Eyebrow>
          </div>
          <div className="scene-title">
            <SectionTitle as="h1" size="anchor" spacing="loose">
              The Portugal <SectionTitle.Em>we travel ourselves</SectionTitle.Em>
            </SectionTitle>
          </div>
          <p className="page-header-support scene-body mt-6 max-w-xl mx-auto text-[15px] md:text-[17px] text-[color:var(--charcoal-soft)]">
            Notes from the road — written by the locals who design our private experiences.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x">
          {featuredComporta ? (
            <article className="mb-16 rounded-[8px] border border-[color:var(--gold-soft)]/70 bg-[color:var(--sand)] p-7 md:mb-20 md:p-10">
              <Eyebrow>Featured guide · Comporta & Tróia</Eyebrow>
              <div className="mt-5 grid gap-7 md:grid-cols-[minmax(0,1.3fr)_auto] md:items-end">
                <div>
                  <h2 className="font-serif text-[30px] leading-[1.18] text-[color:var(--charcoal)] md:text-[38px]">
                    {featuredComporta.h1}
                  </h2>
                  <p className="mt-4 max-w-2xl text-[16px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                    {featuredComporta.standfirst}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                  <CtaButton
                    to="/local-stories/$slug"
                    params={{ slug: featuredComporta.slug }}
                    variant="primary"
                  >
                    Read the Comporta guide
                  </CtaButton>
                  <CtaButton to="/tours/$tourId" params={{ tourId: "troia-comporta" }} variant="ghost">
                    See the private day
                  </CtaButton>
                </div>
              </div>
            </article>
          ) : null}

          <div className="mb-10 max-w-2xl md:mb-14">
            <Eyebrow>Across Portugal</Eyebrow>
            <h2 className="mt-5 font-serif text-[29px] leading-[1.2] text-[color:var(--charcoal)] md:text-[36px]">Places worth knowing</h2>
          </div>
          {renderStories(regionalGroups)}

          <div className="mb-10 mt-20 max-w-2xl md:mb-14 md:mt-24">
            <Eyebrow>On the road</Eyebrow>
            <h2 className="mt-5 font-serif text-[29px] leading-[1.2] text-[color:var(--charcoal)] md:text-[36px]">Days, details and local perspectives</h2>
          </div>
          {renderStories(experienceGroups)}
          <div className="grid gap-x-16 gap-y-12 md:grid-cols-2 md:gap-y-16">
            <Suspense fallback={null}><DeferredJournalPosts staticSlugs={staticSlugs} /></Suspense>
          </div>

          <div className="reveal mt-20 border-t border-[color:var(--gold-soft)]/60 pt-12 text-center md:mt-24 md:pt-16">
            <p className="mx-auto mb-7 max-w-md font-serif text-[26px] leading-[1.3] text-[color:var(--charcoal)] md:text-[30px]">
              Let a place become your own story.
            </p>
            <CtaButton to="/contact" variant="primary">
              Design my experience
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
