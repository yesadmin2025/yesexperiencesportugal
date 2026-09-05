import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export default function DeferredJournalPosts({ staticSlugs }: { staticSlugs: readonly string[] }) {
  const { data: posts } = useQuery({
    queryKey: ["journal_posts", "published"],
    queryFn: fetchPosts,
    staleTime: 60_000,
  });

  const extras = posts?.filter((post) => !staticSlugs.includes(post.slug)) ?? [];
  if (extras.length === 0) return null;

  return (
    <>
      {extras.map((post) => (
        <article key={post.slug} className="group reveal-stagger">
          <Link
            to="/local-stories/$slug"
            params={{ slug: post.slug }}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
          >
            {post.hero_image_url ? (
              <div className="relative overflow-hidden aspect-[3/2] mb-6 shadow-[0_10px_30px_-22px_rgba(46,46,46,0.35)] group-hover:shadow-[0_24px_50px_-22px_rgba(41,91,97,0.28)] transition-shadow duration-500">
                <img
                  src={post.hero_image_url}
                  alt={post.hero_image_alt ?? post.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal)]/55 via-transparent to-transparent" />
                <span className="absolute left-5 bottom-5 block h-px w-8 bg-[color:var(--gold)] opacity-90" />
              </div>
            ) : (
              <div className="aspect-[3/2] mb-6 bg-[color:var(--sand)]" />
            )}
            <div>
              {post.region ? (
                <span className="block font-sans text-[12px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)] mb-3">
                  {post.region}
                </span>
              ) : null}
              <h2 className="font-display text-[1.5rem] md:text-[1.7rem] leading-[1.2] text-[color:var(--charcoal)] mb-3 group-hover:text-[color:var(--teal)] transition-colors duration-300">
                {post.title}
              </h2>
              {post.excerpt ? (
                <p className="text-[15.5px] text-[color:var(--charcoal-soft)] leading-[1.75] max-w-[52ch]">
                  {post.excerpt}
                </p>
              ) : null}
              {post.author_name ? (
                <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                  By {post.author_name}
                </p>
              ) : null}
            </div>
          </Link>
        </article>
      ))}
    </>
  );
}
