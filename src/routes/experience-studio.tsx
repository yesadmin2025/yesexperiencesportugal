import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /experience-studio — legacy alias. The canonical public Experience Studio
 * is /studio-v3 (Living Atlas). Permanently redirects, forwarding search
 * params so deep links keep working. No duplicate SEO surface.
 */
export const Route = createFileRoute("/experience-studio")({
  head: () => ({
    meta: [
      { title: "Experience Studio (moved) — YES Experiences Portugal" },
      { name: "description", content: "Legacy Experience Studio link. This URL now redirects to the current YES Experiences Portugal Experience Studio." },
      { property: "og:title", content: "Experience Studio (moved) — YES Experiences Portugal" },
      { property: "og:description", content: "Legacy Experience Studio link. This URL now redirects to the current YES Experiences Portugal Experience Studio." },
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
