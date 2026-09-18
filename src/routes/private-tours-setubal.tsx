import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /private-tours-setubal → /private-tours-azeitao-setubal#setubal (301).
 *
 * Pickup-area consolidation (US market pass): this thin area page duplicated
 * the destination page that already carries the same pickup copy in its
 * "Where we collect you" block (see AREA_PROFILES), so the destination page
 * owns the intent and this URL redirects to its area anchor.
 */
export const Route = createFileRoute("/private-tours-setubal")({
  loader: () => {
    throw redirect({ href: "/private-tours-azeitao-setubal#setubal", statusCode: 301 });
  },
});
