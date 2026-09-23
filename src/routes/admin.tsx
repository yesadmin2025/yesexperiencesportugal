/**
 * /admin layout — puts every admin page inside the same calm menu
 * (Today · Bookings · Guides · Settings). Client-only because the session
 * lives in the browser. No data loading here.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminFrame } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: () => (
    <AdminFrame>
      <Outlet />
    </AdminFrame>
  ),
});
