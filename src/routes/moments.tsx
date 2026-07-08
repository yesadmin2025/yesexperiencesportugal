import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /moments → /proposal-in-portugal (301).
 *
 * "Moments" is the nav label for the Proposals & Celebrations surface,
 * which lives at the keyword-targeted /proposal-in-portugal URL. Any
 * inbound link that used the label as the path lands on the canonical
 * page rather than 404.
 */
export const Route = createFileRoute("/moments")({
  beforeLoad: () => {
    throw redirect({ to: "/proposal-in-portugal" });
  },
});
