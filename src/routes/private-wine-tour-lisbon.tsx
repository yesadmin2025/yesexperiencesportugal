import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-wine-tour-lisbon → /local-stories/private-wine-tour-lisbon (301).
 */
export const Route = createFileRoute("/private-wine-tour-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "private-wine-tour-lisbon" },
      statusCode: 301,
    });
  },
});
