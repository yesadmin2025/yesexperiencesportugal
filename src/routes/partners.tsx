import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * /partners layout — the hub and the three platform pages share the same
 * SiteLayout chrome. The layout itself is intentionally empty: content is
 * rendered by partners.index.tsx and the three leaf routes.
 */
export const Route = createFileRoute("/partners")({
  component: () => <Outlet />,
});
