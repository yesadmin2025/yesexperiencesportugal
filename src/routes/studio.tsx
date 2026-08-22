import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /studio — short legacy entry point. Permanently redirects to the
 * canonical public Experience Studio, forwarding any search params.
 */
export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio shortcut (moved) — YES Experiences Portugal" },
      { name: "description", content: "Short legacy studio link. This URL redirects to the current YES Experiences Portugal Experience Studio." },
      { property: "og:title", content: "Studio shortcut (moved) — YES Experiences Portugal" },
      { property: "og:description", content: "Short legacy studio link. This URL redirects to the current YES Experiences Portugal Experience Studio." },
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
