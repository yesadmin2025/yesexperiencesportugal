import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminSectionTitle, AdminShell } from "@/components/admin/AdminShell";
import { BookingListRow } from "@/components/admin/ops/BookingListRow";
import { Button } from "@/components/ui/button";
import { listOpsBookings } from "@/lib/bookingsOps.functions";
import { listPaymentRecords } from "@/lib/payments.functions";

type List = Awaited<ReturnType<typeof listOpsBookings>>;
const day = (n = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(Date.now() + n * 86400000));
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Operations · YES Admin" }, { name: "description", content: "Today's tours and reservations needing attention." }, { property: "og:title", content: "Operations · YES Admin" }, { property: "og:description", content: "Today's tours and reservations needing attention." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: OperationsPage,
});
function OperationsPage() {
  const load = useServerFn(listOpsBookings);
  const loadPayments = useServerFn(listPaymentRecords);
  const [list, setList] = useState<List | null>(null);
  const [undated, setUndated] = useState<List["bookings"]>([]);
  const [paymentIssues, setPaymentIssues] = useState<Set<string>>(new Set());
  const [openPayments, setOpenPayments] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const today = day();
  useEffect(() => {
    let live = true;
    Promise.all([load({ data: { status: "all", dateFrom: today, dateTo: day(14), limit: 500 } }), load({ data: { status: "paid", limit: 500 } }), loadPayments()])
      .then(([l, missing, p]) => { if (!live) return; setList(l); setUndated(missing.bookings.filter((x) => !x.preferred_date)); const unresolved = (p.payments as Array<{ match_status: string; booking_id: string | null }>).filter((x) => x.match_status === "unmatched" || x.match_status === "needs_review"); setPaymentIssues(new Set(unresolved.map((x) => x.booking_id).filter((id): id is string => Boolean(id)))); setOpenPayments(unresolved.length); setError(null); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load operations."); });
    return () => { live = false; };
  }, [load, loadPayments, today]);
  const all = list?.bookings ?? [];
  const scheduled = all.filter((b) => b.status !== "cancelled" && b.status !== "refunded" && b.status !== "failed" && b.completeness.state !== "package_payment");
  const todayRows = scheduled.filter((b) => b.preferred_date === today);
  const upcoming = scheduled.filter((b) => b.preferred_date && b.preferred_date > today && b.preferred_date <= day(14));
  const issues = [...scheduled, ...undated.filter((b) => b.completeness.state !== "package_payment" && b.status !== "failed" && b.status !== "cancelled" && b.status !== "refunded")].map((b) => {
    const reasons = [!b.guide_id && "No guide", b.assignment_status === "declined" && "Guide declined", b.guide_id && b.assignment_status !== "confirmed" && b.assignment_status !== "declined" && "Guide not confirmed", b.completeness.state === "incomplete" && b.completeness_label, paymentIssues.has(b.id) && "Payment needs review", b.review_required && (b.review_reason || "Operational change to review")].filter(Boolean) as string[];
    return { row: b, reason: reasons.join(" · ") };
  }).filter((x) => x.reason);
  const dates = Array.from({ length: 15 }, (_, n) => day(n));
  const groups = [{ label: "Today", rows: todayRows }, { label: "Upcoming · next 14 days", rows: upcoming }];
  return <AdminShell eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title="Operations" actions={<div className="flex gap-1" role="group" aria-label="Operations view"><Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>List</Button><Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>Calendar</Button></div>}>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {!list ? <p className="text-sm text-muted-foreground">Loading tours…</p> : null}
    {view === "list" ? <div className="space-y-10">{groups.map((g) => <section key={g.label}><AdminSectionTitle count={g.rows.length}>{g.label}</AdminSectionTitle><ul className="mt-3 border-t border-border">{g.rows.map((row) => <BookingListRow key={row.id} row={row} guides={list?.guides ?? []} />)}</ul>{!g.rows.length ? <p className="mt-3 text-sm text-muted-foreground">No tours.</p> : null}</section>)}<section><AdminSectionTitle count={issues.length + openPayments}>Needs attention</AdminSectionTitle>{openPayments > 0 ? <p className="mt-3 text-sm">{openPayments} payment{openPayments === 1 ? "" : "s"} unmatched or needing review · <Link to="/admin/payments" className="text-primary underline underline-offset-4">Open Payments →</Link></p> : null}<ul className="mt-3 border-t border-border">{issues.map(({ row, reason }) => <BookingListRow key={row.id} row={row} guides={list?.guides ?? []} reason={reason} />)}</ul>{!issues.length && !openPayments ? <p className="mt-3 text-sm text-muted-foreground">Nothing needs attention.</p> : null}{(list?.total ?? 0) > 500 ? <Link to="/admin/bookings" className="text-sm text-primary">Search all bookings →</Link> : null}</section></div> : <section><AdminSectionTitle>Next 14 days</AdminSectionTitle><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{dates.map((date) => <div key={date} className="border-t border-border pt-3"><h3 className="text-sm font-medium">{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</h3><ul>{scheduled.filter((b) => b.preferred_date === date).map((b) => <BookingListRow key={b.id} row={b} guides={list?.guides ?? []} />)}</ul></div>)}</div></section>}
  </AdminShell>;
}
