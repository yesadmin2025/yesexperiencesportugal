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
        <article key={post.slug} className="group reveal-stagger border-t border-[color:var(--gold-soft)]/60 pt-7 md:pt-8">
          <Link
            to="/local-stories/$slug"
            params={{ slug: post.slug }}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
          >
            <div>
              {post.region ? (
                <span className="block font-sans text-[11px] uppercase tracking-[0.17em] text-[color:var(--gold-ink)] mb-4">
                  {post.region}
                </span>
              ) : null}
              <h3 className="font-serif text-[26px] md:text-[28px] leading-[1.22] text-[color:var(--charcoal)] mb-4 group-hover:text-[color:var(--teal)] transition-colors duration-300">
                {post.title}
              </h3>
              {post.excerpt ? (
                <p className="text-[16px] text-[color:var(--charcoal-soft)] leading-[1.7] max-w-[52ch]">
                  {post.excerpt}
                </p>
              ) : null}
              {post.author_name ? (
                <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                  By {post.author_name}
                </p>
              ) : null}
              <span className="mt-5 inline-flex min-h-[44px] items-center font-sans text-[12px] uppercase tracking-[0.17em] text-[color:var(--teal)]">Read the story →</span>
            </div>
          </Link>
        </article>
      ))}
    </>
  );
}
