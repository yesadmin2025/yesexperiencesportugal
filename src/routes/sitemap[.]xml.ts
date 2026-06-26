import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { signatureTours } from "@/data/signatureTours";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://yesexperiencesportugal.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/experiences", changefreq: "weekly", priority: "0.9" },
          { path: "/day-tours", changefreq: "weekly", priority: "0.8" },
          { path: "/multi-day", changefreq: "weekly", priority: "0.8" },
          { path: "/proposals", changefreq: "monthly", priority: "0.7" },
          { path: "/corporate", changefreq: "monthly", priority: "0.7" },
          { path: "/local-stories", changefreq: "weekly", priority: "0.7" },
        ];

        const tourEntries: SitemapEntry[] = signatureTours.map((t) => ({
          path: `/tours/${t.id}`,
          changefreq: "monthly",
          priority: "0.7",
        }));
        const staticArticleEntries: SitemapEntry[] = LOCAL_STORIES_ARTICLES.map((a) => ({
          path: `/local-stories/${a.slug}`,
          lastmod: a.datePublished,
          changefreq: "monthly",
          priority: "0.7",
        }));

        let postEntries: SitemapEntry[] = [];
        try {
          const { data } = await supabase
            .from("journal_posts")
            .select("slug,published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(500);
          postEntries =
            data?.map((p: { slug: string; published_at: string | null }) => ({
              path: `/local-stories/${p.slug}`,
              lastmod: p.published_at ?? undefined,
              changefreq: "monthly",
              priority: "0.6",
            })) ?? [];
        } catch {
          /* tolerate db failures — static entries still ship */
        }

        const staticSlugSet = new Set(LOCAL_STORIES_ARTICLES.map((a) => `/local-stories/${a.slug}`));
        const dedupedDbPosts = postEntries.filter((e) => !staticSlugSet.has(e.path));
        const entries = [...staticEntries, ...tourEntries, ...staticArticleEntries, ...dedupedDbPosts];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
