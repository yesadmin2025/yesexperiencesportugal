import { createFileRoute, redirect } from "@tanstack/react-router";
/** Previous planning board. One Operations view now owns the daily booking list. */
export const Route = createFileRoute("/admin/operations")({
  beforeLoad: () => { throw redirect({ to: "/admin", statusCode: 301 }); },
  head: () => ({ meta: [{ title: "Operations · YES Admin" }, { name: "description", content: "Today's tours and reservations needing attention." }, { property: "og:title", content: "Operations · YES Admin" }, { property: "og:description", content: "Today's tours and reservations needing attention." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
