import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import ogImg from "@/assets/edit-viewpoint.jpg";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

// Database-authored posts are secondary to the static editorial catalogue.
// Keeping this behind a route-level chunk means React Query + Supabase do not
// sit in the critical JS path for the Local Stories landing page.
const DeferredJournalPosts = lazy(() => import("@/components/journal/DeferredJournalPosts"));

export const Route = createFileRoute("/local-stories/")({
  head: () => ({
    meta: [
      { title: "Local Stories — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Local guides to Portugal’s wine regions, private day trips, hidden places and travel planning, written by the team who designs the experiences.",
      },
      { property: "og:title", content: "Local Stories — YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Notes from the road, written by the locals who design our experiences.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/local-stories" },
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
        name: "Local Stories — YES Experiences Portugal",
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
  const staticSlugs = LOCAL_STORIES_ARTICLES.map((article) => article.slug);

  return (
    <SiteLayout>
      <section className="pt-40 pb-16 md:pt-48 md:pb-20 bg-[color:var(--sand)] text-center">
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
          <p className="scene-body mt-6 max-w-xl mx-auto text-[15px] md:text-[17px] text-[color:var(--charcoal-soft)] leading-[1.75]">
            Notes from the road — written by the locals who design our private experiences.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-[color:var(--ivory)]">
        <div className="container-x">
          <div className="grid md:grid-cols-2 gap-10 md:gap-14">
            {LOCAL_STORIES_ARTICLES.map((article) => (
              <article key={article.slug} className="group reveal-stagger">
                <Link
                  to="/local-stories/$slug"
                  params={{ slug: article.slug }}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
                >
                  <div>
                    <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-3">
                      {article.eyebrow}
                    </span>
                    <h2 className="font-display text-[1.5rem] md:text-[1.7rem] leading-[1.2] text-[color:var(--charcoal)] mb-3 group-hover:text-[color:var(--teal)] transition-colors duration-300">
                      {article.h1}
                    </h2>
                    <p className="text-[15.5px] text-[color:var(--charcoal-soft)] leading-[1.75] max-w-[52ch]">
                      {article.standfirst}
                    </p>
                    <span className="mt-4 inline-flex min-h-[44px] items-center font-sans text-[12px] uppercase tracking-[0.22em] text-[color:var(--teal)]">
                      Read the story →
                    </span>
                  </div>
                </Link>
              </article>
            ))}

            <Suspense fallback={null}>
              <DeferredJournalPosts staticSlugs={staticSlugs} />
            </Suspense>
          </div>

          <div className="reveal mt-20 text-center">
            <CtaButton to="/studio-v3" variant="primary">
              Design &amp; Secure Your Experience
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
