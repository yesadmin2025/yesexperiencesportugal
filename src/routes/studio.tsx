import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /studio — short legacy entry point. Permanently redirects to the
 * canonical public Experience Studio, forwarding any search params.
 */
export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — YES Experiences Portugal" },
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
