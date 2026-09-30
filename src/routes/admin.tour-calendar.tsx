import { createFileRoute, redirect } from "@tanstack/react-router";
/** The calendar is now a view on Operations, not another booking screen. */
export const Route = createFileRoute("/admin/tour-calendar")({
  beforeLoad: () => { throw redirect({ to: "/admin", statusCode: 301 }); },
  head: () => ({ meta: [{ title: "Operations calendar · YES Admin" }, { name: "description", content: "Upcoming tour schedule." }, { property: "og:title", content: "Operations calendar · YES Admin" }, { property: "og:description", content: "Upcoming tour schedule." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
