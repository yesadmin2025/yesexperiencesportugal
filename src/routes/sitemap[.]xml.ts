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
        const today = new Date().toISOString().slice(0, 10);
        // NOTE: internal / utility / auth / QA routes are intentionally excluded from the sitemap
        // because they are blocked by robots.txt and should not be indexed. These include:
        // /admin/*, /auth, /booking-confirmed, /brand-qa, /builder, /checkout, /e2e, /email,
        // /hero-verify, /lovable, /preview-check, /qa, /s/, /i/, /studio-drift, /studio-v2,
        // /typography-audit, /unsubscribe.
        const staticEntries: SitemapEntry[] = [
          { path: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
          { path: "/about", lastmod: today, changefreq: "monthly", priority: "0.6" },
          { path: "/press", lastmod: today, changefreq: "monthly", priority: "0.5" },
          { path: "/contact", lastmod: today, changefreq: "monthly", priority: "0.6" },
          { path: "/reviews", lastmod: today, changefreq: "weekly", priority: "0.7" },
          { path: "/experiences", lastmod: today, changefreq: "weekly", priority: "0.9" },
          { path: "/studio-v3", lastmod: today, changefreq: "weekly", priority: "0.9" },
          { path: "/day-tours", lastmod: today, changefreq: "weekly", priority: "0.8" },
          { path: "/multi-day", lastmod: today, changefreq: "weekly", priority: "0.8" },
          { path: "/proposal-in-portugal", lastmod: today, changefreq: "monthly", priority: "0.8" },
          { path: "/corporate", lastmod: today, changefreq: "monthly", priority: "0.7" },
          { path: "/local-stories", lastmod: today, changefreq: "weekly", priority: "0.7" },
          {
            path: "/day-trips-from-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/wine-tours-lisbon", lastmod: today, changefreq: "monthly", priority: "0.9" },
          {
            path: "/private-wine-tour-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/arrabida-wine-tour", lastmod: today, changefreq: "monthly", priority: "0.85" },
          {
            path: "/sintra-day-tour-from-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/arrabida-day-trip-from-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/alentejo-wine-tour-from-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/evora-private-tour-from-lisbon",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/evora-alentejo-wine-tour",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/itineraries/10-day-private-portugal-tour",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/portugal-tours", lastmod: today, changefreq: "monthly", priority: "0.9" },
          {
            path: "/luxury-tours-portugal",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/private-tours-portugal",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/portugal-wine-tours", lastmod: today, changefreq: "monthly", priority: "0.85" },
          {
            path: "/portugal-travel-designer",
            lastmod: today,
            changefreq: "monthly",
            priority: "0.9",
          },

          { path: "/terms", lastmod: today, changefreq: "yearly", priority: "0.4" },
          { path: "/privacy", lastmod: today, changefreq: "yearly", priority: "0.4" },
          { path: "/cookies", lastmod: today, changefreq: "yearly", priority: "0.4" },
        ];

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
          lastmod: today,
          changefreq: "monthly",
          priority: SEO_FOCUS_TOUR_IDS.has(t.id) ? "0.95" : "0.7",
        }));
        const staticArticleEntries: SitemapEntry[] = LOCAL_STORIES_ARTICLES.filter(
          (a) => a.slug !== "best-day-trips-from-lisbon",
        ).map((a) => ({
          path: `/local-stories/${a.slug}`,
          // Omit <lastmod> for static articles — the schema has no
          // dateModified field, so datePublished would freeze the
          // freshness signal at the original publish date.
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

        const staticSlugSet = new Set(
          LOCAL_STORIES_ARTICLES.map((a) => `/local-stories/${a.slug}`),
        );
        const dedupedDbPosts = postEntries.filter((e) => !staticSlugSet.has(e.path));
        const entries = [
          ...staticEntries,
          ...tourEntries,
          ...staticArticleEntries,
          ...dedupedDbPosts,
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
