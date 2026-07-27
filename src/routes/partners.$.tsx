import { createFileRoute, redirect } from "@tanstack/react-router";

/** /partners/* — retired platform landing pages, permanently redirected home. */
export const Route = createFileRoute("/partners/$")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
