import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /wine-tours-lisbon → /local-stories/best-wine-tours-from-lisbon (301).
 */
export const Route = createFileRoute("/wine-tours-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-wine-tours-from-lisbon" },
      statusCode: 301,
    });
  },
});
