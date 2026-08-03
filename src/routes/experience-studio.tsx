import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /experience-studio — legacy alias. The canonical public Experience Studio
 * is /studio-v3 (Living Atlas). Permanently redirects, forwarding search
 * params so deep links keep working. No duplicate SEO surface.
 */
export const Route = createFileRoute("/experience-studio")({
  head: () => ({
    meta: [
      { title: "Experience Studio — YES Experiences Portugal" },
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
