import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { signatureTours } from "@/data/signatureTours";
import { abs } from "@/lib/seo";

const BASE_URL = "https://yesexperiencesportugal.com";

/**
 * /sitemap-images.xml — Google Images discovery for our own photography.
 *
 * Only real, shipped tour photography is listed: the hero plus the gallery
 * of every Signature tour, attached to the tour page that displays it. No
 * stock, no placeholders, no lastmod (we have no page-specific timestamp
 * for image changes).
 */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/sitemap-images.xml")({
  server: {
    handlers: {
      GET: async () => {
        const blocks = signatureTours
          .map((tour) => {
            const images = [tour.img, ...(tour.gallery ?? [])]
              .filter((src): src is string => Boolean(src))
              .map((src) => abs(src));
            const unique = Array.from(new Set(images));
            if (unique.length === 0) return null;
            return [
              `  <url>`,
              `    <loc>${BASE_URL}/tours/${tour.id}</loc>`,
              ...unique.flatMap((src) => [
                `    <image:image>`,
                `      <image:loc>${esc(src)}</image:loc>`,
                `      <image:title>${esc(tour.title)}</image:title>`,
                `      <image:caption>${esc(tour.blurb)}</image:caption>`,
                `    </image:image>`,
              ]),
              `  </url>`,
            ].join("\n");
          })
          .filter((block): block is string => Boolean(block));

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...blocks,
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
