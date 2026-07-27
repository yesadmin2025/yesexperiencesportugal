import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /partners — retired. The platform landing pages were removed; the footer
 * now links straight out to the real marketplace listings.
 */
export const Route = createFileRoute("/partners")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
