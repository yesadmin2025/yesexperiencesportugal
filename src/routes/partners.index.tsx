import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /partners (exact) — retired. The platform landing pages were removed;
 * send visitors to the trade page. Subpaths (/partners/*) are handled by
 * partners.$.tsx and redirect to /reviews.
 */
export const Route = createFileRoute("/partners/")({
  beforeLoad: () => {
    throw redirect({ to: "/trade", statusCode: 301 });
  },
});
