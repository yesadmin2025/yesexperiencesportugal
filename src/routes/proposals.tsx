import { createFileRoute, redirect } from "@tanstack/react-router";

/** /proposals → /proposal-in-portugal (301). Keeps short links working with one canonical URL. */
export const Route = createFileRoute("/proposals")({
  beforeLoad: () => {
    throw redirect({ to: "/proposal-in-portugal", statusCode: 301 });
  },
});
