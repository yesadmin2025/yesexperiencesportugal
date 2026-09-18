import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-wine-tour-lisbon → /local-stories/best-wine-tours-from-lisbon (301).
 */
export const Route = createFileRoute("/private-wine-tour-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-wine-tours-from-lisbon" },
      statusCode: 301,
    });
  },
});
