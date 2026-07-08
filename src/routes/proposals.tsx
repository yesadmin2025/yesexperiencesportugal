import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /proposals is superseded by the keyword-targeted /proposal-in-portugal
 * (Semrush: "proposal in portugal" = 40/mo, KDI 3). This route now
 * permanently redirects so link equity consolidates on the canonical URL.
 * Any internal Navbar/Footer links continue to work; external inbound
 * links are preserved via this redirect.
 */
export const Route = createFileRoute("/proposals")({
  beforeLoad: () => {
    throw redirect({ to: "/proposal-in-portugal" });
  },
});
