import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookingPaymentsPanel } from "@/components/admin/BookingPaymentsPanel";
import { Button } from "@/components/ui/button";
import { getOpsBooking, updateOpsBooking } from "@/lib/bookingsOps.functions";
import { getAdminBooking, cancelAndRefundBooking } from "@/lib/bookingsAdmin.functions";
import { buildSnapshotEmailPreview } from "@/lib/booking-snapshot-contract";

type Data = Awaited<ReturnType<typeof getOpsBooking>>;
const text = (v: unknown) => typeof v === "string" && v.trim() ? v : "—";
const items = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && !!s.trim()) : [];
function Line({ label, value }: { label: string; value: React.ReactNode }) { return <div className="grid gap-1 border-b border-border py-2 text-sm last:border-0 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{value || "—"}</dd></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-t border-border pt-6"><h2 className="font-[family-name:var(--font-editorial)] text-2xl">{title}</h2><div className="mt-3">{children}</div></section>; }
export const Route = createFileRoute("/admin/bookings/$id")({
  component: BookingDetail,
  head: () => ({ meta: [{ title: "Booking details · YES Admin" }, { name: "description", content: "Private booking and operations details." }, { property: "og:title", content: "Booking details · YES Admin" }, { property: "og:description", content: "Private booking and operations details." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
function BookingDetail() {
  const { id } = Route.useParams();
  const load = useServerFn(getOpsBooking);
  const loadPurchase = useServerFn(getAdminBooking);
  const update = useServerFn(updateOpsBooking);
  const refund = useServerFn(cancelAndRefundBooking);
  const [data, setData] = useState<Data | null>(null);
  const [purchase, setPurchase] = useState<Awaited<ReturnType<typeof getAdminBooking>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickup, setPickup] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [guide, setGuide] = useState("");
  const [note, setNote] = useState("");
  const refresh = async () => {
    const [a, p] = await Promise.all([load({ data: { id } }), loadPurchase({ data: { id } })]);
    setData(a); setPurchase(p);
    if (a.booking) { setPickup(a.booking.pickup_location ?? ""); setDate(a.booking.preferred_date ?? ""); setStart(a.booking.start_time ?? ""); setGuide(a.booking.guide_id ?? ""); }
  };
  useEffect(() => { let live = true; Promise.all([load({ data: { id } }), loadPurchase({ data: { id } })]).then(([a, p]) => { if (!live) return; setData(a); setPurchase(p); if (a.booking) { setPickup(a.booking.pickup_location ?? ""); setDate(a.booking.preferred_date ?? ""); setStart(a.booking.start_time ?? ""); setGuide(a.booking.guide_id ?? ""); } }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load booking."); }); return () => { live = false; }; }, [id, load, loadPurchase]);
  const b = data?.booking;
  const snap = purchase?.snapshot && typeof purchase.snapshot === "object" && !Array.isArray(purchase.snapshot) ? purchase.snapshot as Record<string, unknown> : null;
  const preview = buildSnapshotEmailPreview(snap);
  const metadata = b?.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata) ? b.metadata as Record<string, unknown> : {};
  const history = Array.isArray(metadata.ops_edits) ? metadata.ops_edits as Array<Record<string, unknown>> : [];
  const run = async (fn: () => Promise<unknown>, success: string) => { setBusy(true); setNotice(null); try { await fn(); await refresh(); setNotice(success); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  const inputClass = "mt-1 min-h-11 w-full min-w-0 border border-border bg-background px-3 text-base";
  return <AdminShell eyebrow="Reservation" title={text(b?.tour_title ?? b?.source_tour_id) === "—" ? "Booking details" : text(b?.tour_title ?? b?.source_tour_id)}>
    <Link to="/admin/bookings" className="inline-flex min-h-11 items-center text-sm text-primary">← All bookings</Link>
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {!data && !error ? <p className="text-sm">Loading booking…</p> : null}
    {data && !b ? <p>Booking not found.</p> : null}
    {b ? <div className="mt-5 space-y-8">
      <p className="text-sm">Payment: {b.payment_label} · Booking details: {b.completeness_label}</p>
      <Section title="Tour"><dl>
        <Line label="Date" value={text(b.preferred_date)} /><Line label="Pickup time" value={text(b.start_time)} />
        <Line label="Experience" value={text(b.tour_title ?? b.source_tour_id)} /><Line label="Pickup" value={text(b.pickup_location)} /><Line label="Drop-off" value={text(b.dropoff_location)} />
        <Line label="Guests" value={b.guests} /><Line label="Language" value={text(b.language)} />
      </dl><div className="mt-4 space-y-3 text-sm"><div><h3 className="font-medium">Itinerary / stops</h3>{preview.itineraryLines.length ? <ul className="mt-1 list-disc pl-5">{preview.itineraryLines.map((v, i) => <li key={i}>{v}</li>)}</ul> : <p className="text-muted-foreground">Not recorded for this booking.</p>}</div><div><h3 className="font-medium">Included</h3>{(items(b.inclusions).length ? items(b.inclusions) : preview.includedItems).length ? <ul className="mt-1 list-disc pl-5">{(items(b.inclusions).length ? items(b.inclusions) : preview.includedItems).map((v, i) => <li key={i}>{v}</li>)}</ul> : <p className="text-muted-foreground">Not recorded.</p>}</div></div>
      </Section>
      <Section title="Guest"><dl><Line label="Name" value={text(b.customer_name)} /><Line label="Email" value={b.customer_email ? <a className="break-all text-primary underline" href={`mailto:${b.customer_email}`}>{b.customer_email}</a> : "—"} /><Line label="Phone" value={b.customer_phone ? <a className="text-primary underline" href={`tel:${b.customer_phone}`}>{b.customer_phone}</a> : "—"} /><Line label="Requests" value={text(b.client_notes ?? b.notes)} /></dl></Section>
      <Section title="Operations"><dl><Line label="Guide" value={data.guides.find((g) => g.id === b.guide_id)?.name ?? (b.legacy_guide_id ? "Guide not scheduled — reassign" : "Unassigned")} /><Line label="Guide status" value={b.guide_id ? "Scheduled" : "Unassigned"} /><Line label="Internal notes" value={text(b.operational_notes)} /><Line label="Source" value={text(b.source_channel ?? b.source)} /><Line label="Booking reference" value={text(b.stripe_session_id ?? b.id)} /><Line label="External reference" value={text(b.external_booking_ref)} /></dl>
        <details className="mt-4 border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary">Edit operations</summary><div className="grid gap-3 pb-4 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Date<input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Pickup time<input type="time" className={inputClass} value={start.slice(0, 5)} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Pickup<input className={inputClass} value={pickup} onChange={(e) => setPickup(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Guide<select className={inputClass} value={guide} onChange={(e) => setGuide(e.target.value)}><option value="">Unassigned</option>{data.guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <div className="sm:col-span-2"><Button disabled={busy} onClick={() => void run(() => update({ data: { id, ...(date !== (b.preferred_date ?? "") ? { preferredDate: date || null } : {}), ...(start !== (b.start_time ?? "").slice(0, 5) ? { startTime: start || null } : {}), ...(pickup !== (b.pickup_location ?? "") ? { pickupLocation: pickup || null } : {}), ...(guide !== (b.guide_id ?? "") ? { assignedGuideId: guide || null } : {}) } }), "Operations saved.")}>Save changes</Button></div>
          <label className="sm:col-span-2 text-xs text-muted-foreground">Add internal note<textarea className={`${inputClass} min-h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="sm:col-span-2"><Button variant="outline" disabled={busy || !note.trim()} onClick={() => void run(async () => { await update({ data: { id, appendOperationalNote: note.trim() } }); setNote(""); }, "Note added.")}>Add note</Button></div>
        </div></details>
      </Section>
      <BookingPaymentsPanel bookingId={id} paymentLabel={b.payment_label} />
      <Section title="History"><dl><Line label="Created" value={new Date(b.created_at).toLocaleString("en-GB")} /><Line label="Booking status" value={text(b.status)} /></dl>{history.length ? <ul className="mt-3 divide-y divide-border text-sm">{history.slice().reverse().map((h, i) => <li key={i} className="py-2">{typeof h.at === "string" ? new Date(h.at).toLocaleString("en-GB") : "Change recorded"} · {h.changes && typeof h.changes === "object" ? Object.keys(h.changes).map((k) => k.replaceAll("_", " ")).join(", ") : "Operations updated"}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No changes recorded.</p>}{b.status === "paid" ? <div className="mt-5 border-t border-border pt-4"><p className="text-sm text-muted-foreground">Cancellation submits a full refund and emails the guest.</p><Button className="mt-3" variant="destructive" disabled={busy} onClick={() => { if (window.confirm("Cancel this booking and submit a full refund? This cannot be undone.")) void run(() => refund({ data: { id } }), "Cancellation and refund submitted."); }}>Cancel and refund booking</Button></div> : null}</Section>
      {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}
    </div> : null}
  </AdminShell>;
}
