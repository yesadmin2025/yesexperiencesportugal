import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /wine-tours-lisbon → /local-stories/wine-tours-lisbon (301).
 */
export const Route = createFileRoute("/wine-tours-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "wine-tours-lisbon" },
      statusCode: 301,
    });
  },
});
