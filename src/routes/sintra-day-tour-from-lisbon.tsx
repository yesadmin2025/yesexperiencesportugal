import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /sintra-day-tour-from-lisbon → /local-stories/sintra-day-tour-from-lisbon (301).
 */
export const Route = createFileRoute("/sintra-day-tour-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "sintra-day-tour-from-lisbon" },
      statusCode: 301,
    });
  },
});
