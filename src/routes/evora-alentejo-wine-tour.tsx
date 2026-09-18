import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /evora-alentejo-wine-tour → /local-stories/alentejo-wine-tour-from-lisbon (301).
 */
export const Route = createFileRoute("/evora-alentejo-wine-tour")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "alentejo-wine-tour-from-lisbon" },
      statusCode: 301,
    });
  },
});
