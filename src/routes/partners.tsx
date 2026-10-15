import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * /partners — layout only. The exact path redirects in partners.index.tsx
 * (to /trade); subpaths redirect in partners.$.tsx (to /reviews).
 */
export const Route = createFileRoute("/partners")({
  component: () => <Outlet />,
});
