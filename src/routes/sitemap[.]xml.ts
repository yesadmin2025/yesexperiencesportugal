import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { signatureTours } from "@/data/signatureTours";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { supabase } from "@/integrations/supabase/client";
import { PT_PAIRED_PATHS } from "@/i18n/pt-ready";
import { SITEMAP_STATIC_ROUTES } from "@/generated/sitemap-routes";

const BASE_URL = "https://yesexperiencesportugal.com";
const PT_NOINDEX_UTILITY_PATHS = new Set(["/contact", "/privacy", "/cookies"]);

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
        // NOTE: internal / utility / auth / QA routes are intentionally excluded from the sitemap
        // because they are blocked by robots.txt or explicitly noindex and should not be indexed.
        // Static EN routes are generated from the route tree by
        // scripts/generate-sitemap-routes.mjs (redirects, noindex pages,
        // cross-canonical aliases and internal surfaces are filtered out automatically).
        // Dynamic collections (Signature tours, Local Stories and PT twins) are
        // added below from their source-of-truth lists.
        const staticEntries: SitemapEntry[] = SITEMAP_STATIC_ROUTES.map((r) => ({ ...r }));

        // Bump SEO focus tours so they surface ahead of the rest of the Signature
        // catalog for crawlers. Arrábida = best-seller / brand-recognition anchor.
        // Vicentine Coast, Vinho de Talha (Roman Alentejo) and Tróia/Comporta =
        // the three most unique private day tours in the catalog.
        const SEO_FOCUS_TOUR_IDS = new Set([
          "arrabida-wine-allinclusive",
          "southwest-vicentine-coast",
          "troia-comporta",
          "roman-heritage-alentejo",
        ]);
        const tourEntries: SitemapEntry[] = signatureTours.map((t) => ({
          path: `/tours/${t.id}`,
          changefreq: "monthly",
          priority: SEO_FOCUS_TOUR_IDS.has(t.id) ? "0.95" : "0.7",
        }));

        // Defensive slug filter — skip empty/placeholder/malformed slugs so
        // a bad row (or a template stub) can never resurface a broken URL
        // like /local-stories/$slug in the sitemap.
        const PLACEHOLDER_SLUGS = new Set(["", "slug", "undefined", "null", "example"]);
        const isRealSlug = (raw: string | null | undefined): raw is string => {
          if (!raw) return false;
          const s = raw.trim().toLowerCase();
          if (PLACEHOLDER_SLUGS.has(s) || s.startsWith("$")) return false;
          return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2;
        };

        const staticArticleEntries: SitemapEntry[] = LOCAL_STORIES_ARTICLES.filter((a) =>
          isRealSlug(a.slug),
        ).map((a) => ({
          path: `/local-stories/${a.slug}`,
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
            data
              ?.filter((p: { slug: string | null }) => isRealSlug(p.slug))
              .map((p: { slug: string; published_at: string | null }) => ({
                path: `/local-stories/${p.slug}`,
                lastmod: p.published_at ?? undefined,
                changefreq: "monthly",
                priority: "0.6",
              })) ?? [];
        } catch {
          /* tolerate db failures — static entries still ship */
        }

        const staticSlugSet = new Set(
          LOCAL_STORIES_ARTICLES.map((a) => `/local-stories/${a.slug}`),
        );
        const dedupedDbPosts = postEntries.filter((e) => !staticSlugSet.has(e.path));

        // Portuguese twins. PT_PAIRED_PATHS remains the bilingual/hreflang
        // source of truth, but noindex utility pages must not be advertised in
        // sitemap.xml even though they remain valid, linked pages for users.
        const ptEntries: SitemapEntry[] = PT_PAIRED_PATHS.filter(
          (p) => !PT_NOINDEX_UTILITY_PATHS.has(p),
        ).map((p) => ({
          path: p === "/" ? "/pt" : `/pt${p}`,
          changefreq: "monthly",
          priority: p === "/" ? "0.8" : "0.5",
        }));

        const entries = [
          ...staticEntries,
          ...tourEntries,
          ...staticArticleEntries,
          ...dedupedDbPosts,
          ...ptEntries,
        ];

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
