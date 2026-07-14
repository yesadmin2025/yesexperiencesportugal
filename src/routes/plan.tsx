import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for the /plan/* SEO content hub. Child routes provide their
// own head() metadata; this file exists only so /plan/index.tsx and
// each destination/itinerary sibling has an <Outlet /> to mount into.
export const Route = createFileRoute("/plan")({
  component: () => <Outlet />,
});
