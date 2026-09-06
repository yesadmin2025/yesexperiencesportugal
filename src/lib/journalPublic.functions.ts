import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-only boundary for published dynamic journal posts.
 *
 * Static editorial Local Stories resolve entirely from the content catalogue;
 * only non-static slugs reach this boundary, so the browser Supabase client
 * stays out of the Local Stories route chunk. Runs through the privileged
 * server client so published posts are readable regardless of anon policies.
 */
export const getPublishedJournalPost = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(2).max(200) }).parse(input))
  .handler(async ({ data }) => {
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
    return post ?? null;
  });
