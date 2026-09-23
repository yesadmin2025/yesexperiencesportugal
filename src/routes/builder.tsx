import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /builder → /studio (canonical cinematic Studio).
 */
export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Experience Studio — Design Your Private Portugal Tour | YES" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/studio",
      search: search as Record<string, unknown>,
      statusCode: 301,
    });
  },
});
