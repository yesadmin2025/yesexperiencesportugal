import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicJournalPost = {
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
};

const inputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

/**
 * Public fallback for database-authored Local Stories.
 *
 * Static editorial stories never call this function. Keeping the database
 * access behind a TanStack server function means the browser route does not
 * need to import the Supabase client just to support the rare dynamic slug.
 */
export const getPublishedJournalPost = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PublicJournalPost | null> => {
    const { data: row, error } = await supabaseAdmin
      .from("journal_posts")
      .select(
        "slug,title,excerpt,body,hero_image_url,hero_image_alt,region,author_name,signature_slug,published_at",
      )
      .eq("status", "published")
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;

    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      heroImage: row.hero_image_url,
      heroImageAlt: row.hero_image_alt,
      region: row.region,
      authorName: row.author_name,
      signatureSlug: row.signature_slug,
      publishedAt: row.published_at,
    };
  });
