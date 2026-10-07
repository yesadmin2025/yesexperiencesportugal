import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /how-many-days-do-you-need-in-portugal → /how-many-days-in-portugal (301).
 * Google still shows this old address; it previously returned 404.
 */
export const Route = createFileRoute("/how-many-days-do-you-need-in-portugal")({
  beforeLoad: () => {
    throw redirect({ to: "/how-many-days-in-portugal", statusCode: 301 });
  },
});
