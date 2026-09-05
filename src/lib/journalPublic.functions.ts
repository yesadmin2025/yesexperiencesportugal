import { createServerFn } from "@tanstack/react-start";

export type PublishedJournalPost = {
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

export const getPublishedJournalPost = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: data.slug.trim().toLowerCase() }))
  .handler(async ({ data }): Promise<PublishedJournalPost | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post, error } = await supabaseAdmin
      .from("journal_posts")
      .select(
        "slug,title,excerpt,body,hero_image_url,hero_image_alt,region,author_name,signature_slug,published_at",
      )
      .eq("status", "published")
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) throw error;
    return (post ?? null) as PublishedJournalPost | null;
  });
