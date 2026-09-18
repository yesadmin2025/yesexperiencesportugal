import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /portugal-wine-tours → /local-stories/best-wine-tours-from-lisbon (301).
 */
export const Route = createFileRoute("/portugal-wine-tours")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-wine-tours-from-lisbon" },
      statusCode: 301,
    });
  },
});
