import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /portugal-wine-tours → /local-stories/portugal-wine-tours (301).
 */
export const Route = createFileRoute("/portugal-wine-tours")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "portugal-wine-tours" },
      statusCode: 301,
    });
  },
});
