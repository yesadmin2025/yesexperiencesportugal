import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookingListRow } from "@/components/admin/ops/BookingListRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOpsBookings, OPS_CHANNELS } from "@/lib/bookingsOps.functions";

type Result = Awaited<ReturnType<typeof listOpsBookings>>;
const LIMIT = 100;
export const Route = createFileRoute("/admin/bookings/")({
  validateSearch: (s: Record<string, unknown>): { focus?: string; open?: string } => ({
    ...(typeof s.focus === "string" ? { focus: s.focus } : {}),
    ...(typeof s.open === "string" ? { open: s.open } : {}),
  }),
  head: () => ({ meta: [
    { title: "Bookings · YES Operations" }, { name: "description", content: "Search all YES bookings and open one operational record." },
    { property: "og:title", content: "Bookings · YES Operations" }, { property: "og:description", content: "Search all YES bookings and open one operational record." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: BookingsPage,
});
function BookingsPage() {
  const { open } = Route.useSearch();
  const load = useServerFn(listOpsBookings);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState<(typeof OPS_CHANNELS)[number] | "all">("all");
  const [status, setStatus] = useState<"all" | "paid" | "pending" | "cancelled" | "refunded" | "failed">("all");
  const [guide, setGuide] = useState("all");
  const [payment, setPayment] = useState("all");
  const [details, setDetails] = useState("all");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    load({ data: { search: search || undefined, dateFrom: from || undefined, dateTo: to || undefined,
      channels: channel === "all" ? undefined : [channel], status, guide,
      paymentState: payment as "all" | "paid" | "partially_paid" | "paid_via_parent" | "refunded" | "cancelled" | "awaiting_payment" | "unknown",
      completenessState: details as "all" | "complete" | "incomplete" | "package_payment", offset, limit: LIMIT } })
      .then((res) => { if (live) { setData(res); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load bookings."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load, search, from, to, channel, status, guide, payment, details, offset]);
  const rows = data?.bookings ?? [];
  const select = "min-h-11 w-full min-w-0 border border-border bg-background px-2 text-sm";
  const label = "min-w-0 text-xs text-muted-foreground";
  return <AdminShell eyebrow="All channels" title="Bookings" actions={<Button asChild><Link to="/admin/bookings/new">New booking</Link></Button>}>
    {open ? <p className="mb-4 text-sm"><Link to="/admin/bookings/$id" params={{ id: open }}>Open selected booking →</Link></p> : null}
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setOffset(0); setSearch(query.trim()); }}>
      <Input aria-label="Search bookings" type="search" placeholder="Guest, email, phone, booking or payment reference, tour" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button type="submit" variant="outline">Search</Button>
    </form>
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
      <label className={label}>From<input className={select} type="date" value={from} onChange={(e) => { setOffset(0); setFrom(e.target.value); }} /></label>
      <label className={label}>To<input className={select} type="date" value={to} onChange={(e) => { setOffset(0); setTo(e.target.value); }} /></label>
      <label className={label}>Source<select className={select} value={channel} onChange={(e) => { setOffset(0); setChannel(e.target.value as typeof channel); }}><option value="all">All sources</option>{OPS_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className={label}>Booking status<select className={select} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value as typeof status); }}>{["all", "paid", "pending", "cancelled", "refunded", "failed"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}</select></label>
      <label className={label}>Guide<select className={select} value={guide} onChange={(e) => { setOffset(0); setGuide(e.target.value); }}><option value="all">All guides</option><option value="unassigned">Unassigned</option>{data?.guides.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
      <label className={label}>Payment<select className={select} value={payment} onChange={(e) => { setOffset(0); setPayment(e.target.value); }}><option value="all">All payment states</option>{["paid", "partially_paid", "paid_via_parent", "refunded", "cancelled", "awaiting_payment", "unknown"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
      <label className={label}>Booking details<select className={select} value={details} onChange={(e) => { setOffset(0); setDetails(e.target.value); }}><option value="all">All details</option><option value="complete">Complete</option><option value="incomplete">Missing details</option><option value="package_payment">Package payment</option></select></label>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">{loading ? "Loading…" : `${rows.length} shown · ${data?.total ?? 0} matching bookings`}</p>
    {error ? <p role="alert" className="mt-3 text-destructive">{error}</p> : null}
    <ul className="mt-3 border-t border-border">{rows.map((row) => <BookingListRow key={row.id} row={row} guides={data?.guides ?? []} />)}</ul>
    {!loading && !rows.length ? <p className="py-6 text-sm text-muted-foreground">No bookings found. Adjust the filters or search.</p> : null}
    <div className="mt-4 flex items-center justify-between gap-2"><Button variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>Previous</Button><span className="text-xs text-muted-foreground">{data?.total ? offset + 1 : 0}–{Math.min(offset + LIMIT, data?.total ?? 0)}</span><Button variant="outline" disabled={loading || offset + LIMIT >= (data?.total ?? 0)} onClick={() => setOffset(offset + LIMIT)}>Next</Button></div>
  </AdminShell>;
}
