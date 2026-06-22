import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";

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

export const Route = createFileRoute("/local-stories")({
  head: () => ({
    meta: [
      { title: "Local Stories — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Notes from the road, written by the locals who design our private Portugal experiences.",
      },
      { property: "og:title", content: "Local Stories — YES experiences Portugal" },
      {
        property: "og:description",
        content: "Notes from the road, written by the locals who design our experiences.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/local-stories" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/local-stories" }],
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
  const { data: posts, isLoading } = useQuery({
    queryKey: ["journal_posts", "published"],
    queryFn: fetchPosts,
    staleTime: 60_000,
  });

  const hasPosts = !isLoading && posts && posts.length > 0;

  return (
    <SiteLayout>
      {/* Header */}
      <section className="pt-40 pb-16 md:pt-48 md:pb-20 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <Eyebrow flank>Local Stories</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            The Portugal <SectionTitle.Em>we travel ourselves</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 max-w-xl mx-auto text-[15px] md:text-[17px] text-[color:var(--charcoal-soft)] leading-[1.75]">
            Notes from the road — written by the locals who design our private experiences.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-24 md:py-32 bg-[color:var(--ivory)]">
        <div className="container-x">
          {hasPosts ? (
            <div className="grid md:grid-cols-2 gap-10 md:gap-14">
              {posts!.map((p) => (
                <article key={p.slug} className="group reveal-stagger">
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: p.slug }}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
                  >
                    {p.hero_image_url ? (
                      <div className="relative overflow-hidden aspect-[4/5] mb-6 shadow-[0_10px_30px_-22px_rgba(46,46,46,0.35)] group-hover:shadow-[0_24px_50px_-22px_rgba(41,91,97,0.28)] transition-shadow duration-700">
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
                      <div className="aspect-[4/5] mb-6 bg-[color:var(--sand)]" />
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
            <CtaButton to="/builder" variant="primary">
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
