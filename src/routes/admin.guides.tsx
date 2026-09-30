import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { listGuides } from "@/lib/guides.functions";
import { getOperationsBoard } from "@/lib/operations.functions";

type Guides = Awaited<ReturnType<typeof listGuides>>;
type Board = Awaited<ReturnType<typeof getOperationsBoard>>;
const date = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
export const Route = createFileRoute("/admin/guides")({
  component: GuidesPage,
  head: () => ({ meta: [{ title: "Guides · YES Admin" }, { name: "description", content: "Guide contacts, availability and upcoming tours." }, { property: "og:title", content: "Guides · YES Admin" }, { property: "og:description", content: "Guide contacts, availability and upcoming tours." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
function GuidesPage() {
  const loadGuides = useServerFn(listGuides);
  const loadBoard = useServerFn(getOperationsBoard);
  const [guides, setGuides] = useState<Guides["guides"]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; Promise.all([loadGuides(), loadBoard({ data: { from: date(0), to: date(30) } })]).then(([g, b]) => { if (live) { setGuides(g.guides); setBoard(b); } }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load guides."); }); return () => { live = false; }; }, [loadGuides, loadBoard]);
  return <AdminShell eyebrow="Team" title="Guides" actions={<Button asChild variant="outline"><Link to="/admin/more">Team tools</Link></Button>}>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <ul className="divide-y divide-border border-t border-border">{guides.map((g) => {
      const next = board?.assignments.filter((a) => a.guide_id === g.id && a.status !== "declined").sort((a, b) => a.start_at.localeCompare(b.start_at))[0];
      const booking = board?.bookings.find((b) => b.id === next?.booking_id);
      const slots = board?.availability.filter((a) => a.guide_id === g.id) ?? [];
      return <li key={g.id} className="py-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="min-w-0 space-y-1 text-sm"><h2 className="font-[family-name:var(--font-editorial)] text-xl">{g.name}</h2><p className="break-all text-muted-foreground">{[g.email, g.phone].filter(Boolean).join(" · ") || "No contact saved"}</p><p>{g.active ? "Active" : "Inactive"} · {g.app_linked ? "App connected" : g.approval_status === "pending" ? "Access awaiting approval" : "App not connected"}</p><p className="text-muted-foreground">Next tour: {booking ? `${booking.preferred_date ?? "Date to confirm"} · ${booking.tour_title ?? booking.source_tour_id ?? "Tour to confirm"}` : "None scheduled"}</p><p className="text-muted-foreground">Availability: {slots.length ? slots.map((s) => s.status).join(", ") : "Not set for the next 30 days"}</p></div><Link to="/admin/guides/$id" params={{ id: g.id }} className="inline-flex min-h-11 shrink-0 items-center self-start text-sm text-primary underline underline-offset-4">Open guide →</Link></div></li>;
    })}</ul>
    {guides.length === 0 && !error ? <p className="py-6 text-sm text-muted-foreground">Loading guides…</p> : null}
  </AdminShell>;
}
