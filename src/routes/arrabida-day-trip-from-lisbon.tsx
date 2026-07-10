import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /arrabida-day-trip-from-lisbon → /local-stories/arrabida-day-trip-from-lisbon (301).
 *
 * All long-form Portugal editorial now lives under a single URL pattern —
 * /local-stories/<slug>. Article content preserved 1:1 at the canonical URL.
 */
export const Route = createFileRoute("/arrabida-day-trip-from-lisbon")({
  beforeLoad: () => {
    throw redirect({
      to: "/local-stories/$slug",
      params: { slug: "arrabida-day-trip-from-lisbon" },
      statusCode: 301,
    });
  },
});
