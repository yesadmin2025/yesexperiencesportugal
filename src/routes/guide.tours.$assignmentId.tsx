import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { db, errMsg, fetchMyTours, fmtDate, fmtPax, type GuideTour } from "@/components/guide/guide-data";
import { tourBadge } from "@/components/guide/TourCard";

export const Route = createFileRoute("/guide/tours/$assignmentId")({
  head: () => ({ meta: [{ title: "Tour details · YES Guide" }] }),
  component: TourDetails,
});

type Note = { id: string; note: string; priority: string; created_at: string };

function TourDetails() {
  const { assignmentId } = Route.useParams();
  const [tour, setTour] = useState<GuideTour | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [issue, setIssue] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await fetchMyTours();
    const t = all.find((x) => x.assignment_id === assignmentId) ?? null;
    setTour(t);
    if (t) {
      await db.rpc("guide_mark_viewed", { _assignment_id: t.assignment_id });
      const { data } = await db.from("operational_notes").select("id, note, priority, created_at").eq("booking_id", t.booking_id).order("created_at", { ascending: false });
      setNotes(data ?? []);
    }
  }, [assignmentId]);

  useEffect(() => {
    load().catch(() => setTour(null));
  }, [load]);

  if (tour === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (tour === null)
    return (
      <div className="space-y-3">
        <p className="text-sm">Tour not found.</p>
        <Link to="/guide/tours" className="text-sm text-[color:var(--teal)]">Back to my tours</Link>
      </div>
    );

  const b = tourBadge(tour);
  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw new Error(error.message);
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className={`text-[11px] px-2 py-0.5 ${b.cls}`}>{b.label}</span>
        <h1 className="font-[family-name:var(--font-editorial)] text-[28px] leading-tight mt-2">{tour.tour_title ?? "Tour"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{fmtDate(tour.tour_date)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Fact k="Time" v={tour.start_time ?? "To be confirmed"} />
        <Fact k="Guests" v={String(tour.guests ?? "?")} />
        <Fact k="Lead guest" v={tour.guest_first_name || "—"} />
        <Fact k="Language" v={tour.language ?? "EN"} />
        <Fact k="Pickup" v={tour.pickup_location ?? "To be confirmed"} wide />
        {tour.dropoff_location && <Fact k="Drop-off" v={tour.dropoff_location} wide />}
      </dl>

      {tour.client_notes && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Special requests</h2>
          <p className="text-sm border-l-2 border-[color:var(--gold)] pl-3 whitespace-pre-line">{tour.client_notes}</p>
        </section>
      )}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Notes from the office</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <p key={n.id} className={`text-sm border-l-2 pl-3 ${n.priority === "critical" ? "border-destructive" : n.priority === "important" ? "border-[color:var(--gold)]" : "border-border"}`}>
                {n.priority !== "normal" && <span className="block text-[11px] uppercase tracking-[0.14em] text-destructive">{n.priority}</span>}
                {n.note}
              </p>
            ))}
          </div>
        )}
      </section>

      {!tour.booking_cancelled && (
        <div className="space-y-3">
          {!tour.guide_confirmed_at || tour.status === "changed" ? (
            <button disabled={busy} onClick={() => act(() => db.rpc("guide_confirm_assignment", { _assignment_id: tour.assignment_id }), "Confirmed — thank you")} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">
              Confirm assignment
            </button>
          ) : (
            <p className="text-sm text-[color:var(--teal)]">You confirmed this tour.</p>
          )}
          {showIssue ? (
            <div className="space-y-2">
              <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} className="w-full border border-border p-2 text-sm bg-background" placeholder="What's the problem? The office will contact you." />
              <button
                disabled={busy || !issue.trim()}
                onClick={() => act(() => db.rpc("guide_report_issue", { _booking_id: tour.booking_id, _message: issue.trim() }), "Sent to the office")}
                className="w-full min-h-12 border border-destructive text-destructive text-[12px] uppercase tracking-[0.18em] disabled:opacity-50"
              >
                Send report
              </button>
            </div>
          ) : (
            <button onClick={() => setShowIssue(true)} className="w-full min-h-12 border border-border text-[12px] uppercase tracking-[0.18em]">
              Report an issue
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={`border border-border p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{k}</dt>
      <dd className="mt-1">{v}</dd>
    </div>
  );
}
