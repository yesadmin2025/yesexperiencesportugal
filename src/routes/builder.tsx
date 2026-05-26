import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /builder is deprecated — the canonical experience builder is now
 * /studio-v2 (cinematic, infer-driven flow). All legacy CTAs across
 * the site still target /builder, so we redirect at the route level
 * to keep every entry point landing on the new Studio.
 */
export const Route = createFileRoute("/builder")({
  beforeLoad: () => {
    throw redirect({ to: "/studio-v2" });
  },
});
