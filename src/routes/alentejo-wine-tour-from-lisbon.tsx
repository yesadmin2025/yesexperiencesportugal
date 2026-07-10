import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /alentejo-wine-tour-from-lisbon → /local-stories/alentejo-wine-tour-from-lisbon (301).
 */
export const Route = createFileRoute("/alentejo-wine-tour-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "alentejo-wine-tour-from-lisbon" },
      statusCode: 301,
    });
  },
});
