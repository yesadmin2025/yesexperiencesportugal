import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Splat catch-all for `/pt/<anything>` while per-route Portuguese pages
 * are still being authored. Any unknown PT subpath 302s back to the
 * PT landing at `/pt`. Once a page has published PT copy we replace
 * this behaviour by shipping a real `pt.<name>.tsx` route file.
 */
export const Route = createFileRoute("/pt/$")({
  beforeLoad: () => {
    throw redirect({ to: "/pt", replace: true, statusCode: 301 });
  },
});
