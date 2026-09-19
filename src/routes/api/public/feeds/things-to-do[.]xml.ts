import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { buildThingsToDoProducts, thingsToDoRss } from "@/lib/seo/things-to-do-feed";

/**
 * Public product feed for a direct Google "Things to do" / Merchant Center
 * integration (no OTA in between). Fetchable daily by Google.
 */
export const Route = createFileRoute("/api/public/feeds/things-to-do.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(thingsToDoRss(buildThingsToDoProducts()), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
