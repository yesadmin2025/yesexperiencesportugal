import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { CtaButton } from "@/components/ui/CtaButton";

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

export const Route = createFileRoute("/local-stories/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Local Story — YES experiences Portugal` },
      {
        name: "description",
        content: `A local story from Portugal · ${params.slug}`,
      },
    ],
  }),
  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
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

  // Render body as paragraphs (simple markdown-lite: split by blank line)
  const paragraphs = post.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <SiteLayout>
      <article>
        {/* Hero */}
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

        {/* Body */}
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

            {/* Signature link (when set) */}
            {post.signature_slug && (
              <aside className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 text-center">
                <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
                  Travel this story
                </span>
                <p className="text-[15px] text-[color:var(--charcoal-soft)] mb-6">
                  The places in this piece live inside one of our private days.
                </p>
                <CtaButton to="/tours/$tourId" params={{ tourId: post.signature_slug }} variant="primary">
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
