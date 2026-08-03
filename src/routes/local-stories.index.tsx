import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { Scene } from "@/components/motion/Scene";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import ogImg from "@/assets/edit-viewpoint.jpg";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

type JournalPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  region: string | null;
  author_name: string | null;
  published_at: string | null;
};

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
    // Self-canonical for the hub itself. Safe here: this is the `/local-stories/`
    // index leaf, a SIBLING of `/local-stories/$slug` — TanStack only
    // concatenates links from PARENT routes, so article pages keep their own
    // single canonical. Never move this into `local-stories.tsx` (the layout).
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
        blogPost: LOCAL_STORIES_ARTICLES.map((a) => ({
          "@type": "BlogPosting",
          headline: a.h1,
          name: a.title,
          description: a.metaDescription,
          url: `https://yesexperiencesportugal.com/local-stories/${a.slug}`,
          datePublished: a.datePublished,
        })),
      }),
    ],
  }),

  component: Page,
});

async function fetchPosts(): Promise<JournalPost[]> {
  const { data, error } = await supabase
    .from("journal_posts")
    .select("slug,title,excerpt,hero_image_url,hero_image_alt,region,author_name,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as JournalPost[];
}

function Page() {
  useMarketingMotion();
  const { data: posts, isLoading } = useQuery({
    queryKey: ["journal_posts", "published"],
    queryFn: fetchPosts,
    staleTime: 60_000,
  });

  const staticArticles = LOCAL_STORIES_ARTICLES;
  const hasContent = staticArticles.length > 0 || (!isLoading && posts && posts.length > 0);

  return (
    <SiteLayout>
      {/* Header */}
      <section className="pt-40 pb-16 md:pt-48 md:pb-20 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Scene>
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
          </Scene>
        </div>
      </section>

      {/* Body */}
      <section className="py-24 md:py-32 bg-[color:var(--ivory)]">
        <div className="container-x">
          {hasContent ? (
            <div className="grid md:grid-cols-2 gap-10 md:gap-14">
              {staticArticles.map((a) => (
                <article key={a.slug} className="group reveal-stagger">
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: a.slug }}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
                  >
                    <div>
                      <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-3">
                        {a.eyebrow}
                      </span>
                      <h2 className="font-display text-[1.5rem] md:text-[1.7rem] leading-[1.2] text-[color:var(--charcoal)] mb-3 group-hover:text-[color:var(--teal)] transition-colors duration-300">
                        {a.h1}
                      </h2>
                      <p className="text-[15.5px] text-[color:var(--charcoal-soft)] leading-[1.75] max-w-[52ch]">
                        {a.standfirst}
                      </p>
                      <span className="mt-4 inline-block font-sans text-[12px] uppercase tracking-[0.24em] text-[color:var(--teal)]">
                        Read the story →
                      </span>
                    </div>
                  </Link>
                </article>
              ))}

              {posts
                ?.filter((p) => !LOCAL_STORIES_ARTICLES.some((a) => a.slug === p.slug))
                .map((p) => (
                  <article key={p.slug} className="group reveal-stagger">
                    <Link
                      to="/local-stories/$slug"
                      params={{ slug: p.slug }}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
                    >
                      {p.hero_image_url ? (
                        <div className="relative overflow-hidden aspect-[3/2] mb-6 shadow-[0_10px_30px_-22px_rgba(46,46,46,0.35)] group-hover:shadow-[0_24px_50px_-22px_rgba(41,91,97,0.28)] transition-shadow duration-700">
                          <img
                            src={p.hero_image_url}
                            alt={p.hero_image_alt ?? p.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal)]/55 via-transparent to-transparent" />
                          <span className="absolute left-5 bottom-5 block h-px w-8 bg-[color:var(--gold)] opacity-90" />
                        </div>
                      ) : (
                        <div className="aspect-[3/2] mb-6 bg-[color:var(--sand)]" />
                      )}
                      <div>
                        {p.region && (
                          <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-3">
                            {p.region}
                          </span>
                        )}
                        <h2 className="font-display text-[1.5rem] md:text-[1.7rem] leading-[1.2] text-[color:var(--charcoal)] mb-3 group-hover:text-[color:var(--teal)] transition-colors duration-300">
                          {p.title}
                        </h2>
                        {p.excerpt && (
                          <p className="text-[15.5px] text-[color:var(--charcoal-soft)] leading-[1.75] max-w-[52ch]">
                            {p.excerpt}
                          </p>
                        )}
                        {p.author_name && (
                          <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                            By {p.author_name}
                          </p>
                        )}
                      </div>
                    </Link>
                  </article>
                ))}
            </div>
          ) : (
            <EmptyState loading={isLoading} />
          )}

          <div className="reveal mt-20 text-center">
            <CtaButton to="/experience-studio" variant="primary">
              Design &amp; Secure Your Experience
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="max-w-xl mx-auto text-center py-16 md:py-24">
      <span className="block mx-auto h-px w-12 bg-[color:var(--gold)] mb-8" />
      <p className="font-serif italic text-[1.35rem] md:text-[1.6rem] leading-[1.45] text-[color:var(--charcoal)]">
        {loading ? "Loading…" : "Quietly being written."}
      </p>
      {!loading && (
        <p className="mt-6 text-[14.5px] text-[color:var(--charcoal-soft)] leading-[1.75]">
          Our first local stories are on the way. In the meantime, the same voices that will write
          them are already designing private days across Portugal.
        </p>
      )}
    </div>
  );
}
