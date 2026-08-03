import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Historical Living Atlas preview URL.
 *
 * The Living Atlas is now the production Experience Studio, so this route
 * permanently forwards to the canonical public URL and preserves query data.
 */
export const Route = createFileRoute("/studio-living-atlas-preview")({
  head: () => ({
    meta: [
      { title: "Experience Studio | YES Experiences Portugal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/experience-studio",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
