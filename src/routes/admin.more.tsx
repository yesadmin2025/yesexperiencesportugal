import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_GROUPS } from "@/components/admin/AdminNavIndex";
export const Route = createFileRoute("/admin/more")({
  component: MorePage,
  head: () => ({ meta: [{ title: "More · YES Admin" }, { name: "description", content: "Occasional operations and website tools." }, { property: "og:title", content: "More · YES Admin" }, { property: "og:description", content: "Occasional operations and website tools." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
const groups = [
  { title: "Operations tools", links: [
    { to: "/admin/bookings/new", label: "New booking" },
    { to: "/admin/availability", label: "Experience availability" },
    { to: "/admin/enquiries", label: "Enquiries" },
    { to: "/admin/activity", label: "Activity" },
    { to: "/admin/settings", label: "Connections & automation" },
    { to: "/admin/studio-proposals", label: "Studio proposals" },
    { to: "/admin/emails", label: "Email delivery" },
    { to: "/admin/webhook-events", label: "Payment events" },
    { to: "/admin/payments-env", label: "Payment settings" },
  ] },
  { title: "Experience content", links: [
    { to: "/admin/experiences", label: "Tour details" },
    ...ADMIN_GROUPS.find((g) => g.title === "Prices")?.links ?? [],
    ...(ADMIN_GROUPS.find((g) => g.title === "Experiences & content")?.links ?? []).filter((l) => l.to !== "/admin/experiences"),
  ] },
  { title: "Website & checks", links: ADMIN_GROUPS.filter((g) => ["Reviews", "Search & visibility", "Health & diagnostics"].includes(g.title)).flatMap((g) => g.links) },
];
function MorePage() { return <AdminShell eyebrow="Occasional tools" title="More">
  <div className="space-y-9">{groups.map((g) => <section key={g.title}><h2 className="font-[family-name:var(--font-editorial)] text-xl">{g.title}</h2><ul className="mt-3 divide-y divide-border border-t border-border">{g.links.map((l) => <li key={l.to}><Link to={l.to} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-primary"><span>{l.label}</span><span aria-hidden>→</span></Link></li>)}</ul></section>)}</div>
</AdminShell>; }
