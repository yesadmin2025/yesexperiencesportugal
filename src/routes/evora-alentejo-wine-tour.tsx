import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /evora-alentejo-wine-tour → /local-stories/evora-alentejo-wine-tour (301).
 */
export const Route = createFileRoute("/evora-alentejo-wine-tour")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "evora-alentejo-wine-tour" },
      statusCode: 301,
    });
  },
});
