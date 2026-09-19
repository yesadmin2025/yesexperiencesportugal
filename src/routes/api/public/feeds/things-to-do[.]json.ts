import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { buildThingsToDoProducts, validateThingsToDoFeed } from "@/lib/seo/things-to-do-feed";

/**
 * JSON twin of the Things to do product feed, plus a self-validation block so
 * feed readiness can be checked from the browser without running the suite.
 */
export const Route = createFileRoute("/api/public/feeds/things-to-do.json")({
  server: {
    handlers: {
      GET: async () => {
        const products = buildThingsToDoProducts();
        const issues = validateThingsToDoFeed(products);
        return new Response(
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              count: products.length,
              valid: issues.length === 0,
              issues,
              products,
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
