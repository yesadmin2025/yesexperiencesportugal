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
        // NOTE: internal / utility / auth / QA routes are intentionally excluded from the sitemap
        // because they are blocked by robots.txt and should not be indexed. These include:
        // /admin/*, /auth, /booking-confirmed, /brand-qa, /builder, /checkout, /e2e, /email,
        // /hero-verify, /lovable, /preview-check, /qa, /s/, /i/, /studio-drift, /studio-v2,
        // /typography-audit, /unsubscribe. /reviews (thin widget) and
        // /portugal-travel-designer (301 → /multi-day) are also excluded.
        // Static entries omit <lastmod> on purpose — a rolling "today" trains
        // crawlers to ignore the field. Dynamic DB posts keep their real
        // published_at.
        //
        // Explicitly excluded from this sitemap (SEO scanner note):
        // - /alentejo-wine-tour-from-lisbon, /arrabida-day-trip-from-lisbon, /arrabida-wine-tour:
        //   these are 301 redirects to /local-stories/<slug>. Sitemaps must list only
        //   HTTP 200 final destinations; the canonical article URLs are already emitted below
        //   by LOCAL_STORIES_ARTICLES and the journal_posts query.
        // - /auth, /booking-confirmed: both have robots noindex/nofollow and are Disallow'd in
        //   robots.txt; they must not appear in the sitemap.
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/press", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/partners", changefreq: "monthly", priority: "0.6" },
          { path: "/partners/viator", changefreq: "monthly", priority: "0.55" },
          { path: "/partners/getyourguide", changefreq: "monthly", priority: "0.55" },
          { path: "/partners/tripadvisor", changefreq: "monthly", priority: "0.55" },
          // /faq and /moments intentionally omitted — both 301 to canonical
          // targets (/about and /proposal-in-portugal). Sitemap URLs must be
          // final destinations (HTTP 200), never redirects.
          { path: "/experiences", changefreq: "weekly", priority: "0.9" },
          { path: "/studio-v3", changefreq: "weekly", priority: "0.9" },
          { path: "/day-tours", changefreq: "weekly", priority: "0.8" },
          { path: "/multi-day", changefreq: "weekly", priority: "0.9" },
          { path: "/portugal-travel-designer", changefreq: "monthly", priority: "0.85" },

          { path: "/proposal-in-portugal", changefreq: "monthly", priority: "0.8" },
          { path: "/corporate", changefreq: "monthly", priority: "0.7" },
          { path: "/local-stories", changefreq: "weekly", priority: "0.7" },
          {
            path: "/itineraries/10-day-private-portugal-tour",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/portugal-tours", changefreq: "monthly", priority: "0.9" },
          { path: "/luxury-tours-portugal", changefreq: "monthly", priority: "0.85" },
          { path: "/private-tours-portugal", changefreq: "monthly", priority: "0.85" },
          // High-intent SEO landing routes (/arrabida-wine-tour,
          // /arrabida-day-trip-from-lisbon, /alentejo-wine-tour-from-lisbon,
          // /evora-alentejo-wine-tour) intentionally omitted — all 301 to
          // their /local-stories/… canonicals (already emitted by
          // LOCAL_STORIES_ARTICLES). Sitemap URLs must be HTTP 200.
          // NOTE: /local-stories/* entries below were previously hard-coded
          // here AND also emitted by `staticArticleEntries` (from
          // LOCAL_STORIES_ARTICLES), producing duplicate <loc> pairs in
          // sitemap.xml (flagged by Google Search Console). Source of truth
          // for Local Stories is LOCAL_STORIES_ARTICLES — do not re-add
          // /local-stories/* here.




          { path: "/terms", changefreq: "yearly", priority: "0.4" },
          { path: "/privacy", changefreq: "yearly", priority: "0.4" },
          { path: "/cookies", changefreq: "yearly", priority: "0.4" },
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
