import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /evora-private-tour-from-lisbon → surviving Alentejo guide (301).
 */
export const Route = createFileRoute("/evora-private-tour-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "alentejo-wine-tour-from-lisbon" },
      statusCode: 301,
    });
  },
});
