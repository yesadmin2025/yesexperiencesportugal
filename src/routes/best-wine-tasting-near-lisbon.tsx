import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /best-wine-tasting-near-lisbon → /local-stories/best-wine-tasting-near-lisbon (301).
 * Top-level SEO lander preserved as a redirect to the canonical article URL.
 */
export const Route = createFileRoute("/best-wine-tasting-near-lisbon")({
  loader: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-wine-tasting-near-lisbon" },
      statusCode: 301,
    });
  },
});
