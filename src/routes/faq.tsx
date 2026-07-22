import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /faq → /about (301).
 *
 * FAQ content lives inline on tour pages and on /about (studio approach,
 * booking, cancellation via /terms). Redirect prevents inbound 404s.
 */
export const Route = createFileRoute("/faq")({
  beforeLoad: () => {
    throw redirect({ to: "/about", statusCode: 301 });
  },
});
