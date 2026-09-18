import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-tours-from-lisbon → /lisbon-private-tours (301).
 * The guide that used to own this URL was consolidated into the hub page.
 */
export const Route = createFileRoute("/private-tours-from-lisbon")({
  loader: () => {
    throw redirect({ href: "/lisbon-private-tours", statusCode: 301 });
  },
});
