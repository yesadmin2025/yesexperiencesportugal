import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /arrabida-wine-tour → /local-stories/arrabida-wine-tour (301).
 * See day-trips-from-lisbon.tsx for the normalisation rationale.
 */
export const Route = createFileRoute("/arrabida-wine-tour")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "arrabida-wine-tour" },
      statusCode: 301,
    });
  },
});
