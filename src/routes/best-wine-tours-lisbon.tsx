import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /best-wine-tours-lisbon → /local-stories/best-wine-tours-from-lisbon (301).
 * Top-level SEO lander preserved as a redirect to the canonical article URL.
 */
export const Route = createFileRoute("/best-wine-tours-lisbon")({
  loader: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-wine-tours-from-lisbon" },
      statusCode: 301,
    });
  },
});
