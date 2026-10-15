import { createFileRoute, redirect } from "@tanstack/react-router";

/** /partners/* — retired platform landing pages, permanently redirected to /reviews (platform listings + reviews); a redirect home reads as Soft 404. */
export const Route = createFileRoute("/partners/$")({
  beforeLoad: () => {
    throw redirect({ to: "/reviews", statusCode: 301 });
  },
});
