import { createFileRoute, redirect } from "@tanstack/react-router";

// /portugal-travel-designer duplicated /multi-day (Travel Designer canonical).
// Permanent 301 consolidates SEO authority to /multi-day.
export const Route = createFileRoute("/portugal-travel-designer")({
  beforeLoad: () => {
    throw redirect({ to: "/multi-day", replace: true, statusCode: 301 });
  },
});
