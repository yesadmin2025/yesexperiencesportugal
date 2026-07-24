import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-tours-from-lisbon → /local-stories/private-tours-from-lisbon (301).
 * Top-level SEO lander preserved as a redirect to the canonical article URL.
 */
export const Route = createFileRoute("/private-tours-from-lisbon")({
  loader: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "private-tours-from-lisbon" },
      statusCode: 301,
    });
  },
});
