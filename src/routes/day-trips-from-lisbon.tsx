import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /day-trips-from-lisbon → /local-stories/best-day-trips-from-lisbon (301).
 *
 * All long-form Portugal editorial now lives under a single URL pattern —
 * /local-stories/<slug>. This former top-level SEO lander is preserved as
 * a 301 so external inbound links keep working and search engines
 * consolidate signal onto the canonical article URL.
 */
export const Route = createFileRoute("/day-trips-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "best-day-trips-from-lisbon" },
      statusCode: 301,
    });
  },
});
