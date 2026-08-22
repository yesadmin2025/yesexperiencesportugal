import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /studio-living-atlas-preview — the Living Atlas prototype route.
 *
 * The Living Atlas is now the live public Experience Studio at /studio-v3,
 * so this prototype URL permanently redirects there. Keeping it as a
 * redirect (rather than a second rendering surface) avoids a duplicate SEO
 * surface and stops customers landing on a route named "preview".
 *
 * The file-router plugin regenerates routeTree.gen.ts during Vite dev/build.
 * The literal path must remain directly inside createFileRoute so the TanStack
 * generator can discover it.
 */
export const Route = createFileRoute("/studio-living-atlas-preview")({
  head: () => ({
    meta: [
      { title: "Living Atlas preview (moved) — YES Experiences Portugal" },
      { name: "description", content: "The Living Atlas prototype is now the live Experience Studio. This URL redirects to the current studio." },
      { property: "og:title", content: "Living Atlas preview (moved) — YES Experiences Portugal" },
      { property: "og:description", content: "The Living Atlas prototype is now the live Experience Studio. This URL redirects to the current studio." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/studio-v3",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
