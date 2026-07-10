import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * `/pt/*` layout. Locale detection happens in __root via the URL, so
 * we just need this file to exist for children (pt.index.tsx, pt.$.tsx)
 * to mount. All UI localization is driven by LocaleProvider upstream.
 */
export const Route = createFileRoute("/pt")({
  component: () => <Outlet />,
});
