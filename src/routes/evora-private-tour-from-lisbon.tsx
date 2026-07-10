import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /evora-private-tour-from-lisbon → /local-stories/evora-private-tour-from-lisbon (301).
 */
export const Route = createFileRoute("/evora-private-tour-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "evora-private-tour-from-lisbon" },
      statusCode: 301,
    });
  },
});
