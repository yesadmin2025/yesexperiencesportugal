import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { db, errMsg, fetchMyTours, type GuideTour } from "@/components/guide/guide-data";
import { GuestActions, TourEssentials, tourBadge } from "@/components/guide/TourCard";
import { findTour } from "@/data/signatureTours";

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

  const version = useGuideRefresh();
  const markedRef = useRef<string | null>(null);
  const load = useCallback(async () => {
    const all = await fetchMyTours();
    const t = all.find((x) => x.assignment_id === assignmentId) ?? null;
    setTour(t);
    if (t) {
      // Mark viewed once per tour — repeating it re-triggered live refreshes in a loop (screen shaking).
      if (markedRef.current !== t.assignment_id) {
        markedRef.current = t.assignment_id;
        await db.rpc("guide_mark_viewed", { _assignment_id: t.assignment_id });
      }
      const { data } = await db.from("operational_notes").select("id, note, priority, created_at").eq("booking_id", t.booking_id).order("created_at", { ascending: false });
      setNotes(data ?? []);
    }
  }, [assignmentId]);

  useEffect(() => {
    load().catch(() => setTour((prev) => (prev === undefined ? null : prev)));
  }, [load, version]);

  if (tour === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (tour === null)
    return (
      <div className="space-y-3">
        <p className="text-sm">Tour not found.</p>
        <Link to="/guide" className="text-sm text-[color:var(--teal)]">Back to My Tours</Link>
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

  const bookingItinerary = Array.isArray(tour.itinerary) ? tour.itinerary : [];
  const bookingIncluded = Array.isArray(tour.included_items) ? tour.included_items.filter((x) => typeof x === "string" && x.trim()) : [];
  // Last-resort fallback: the public Signature catalogue (labels, stories, inclusions only — never prices).
  // Only when the booking IS that Signature tour (same title or no title of its own) — a custom day never borrows it.
  const found = tour.source_tour_id ? findTour(tour.source_tour_id) : undefined;
  const catalogue = found && (!tour.tour_title || tour.tour_title.trim().toLowerCase() === found.title.trim().toLowerCase() || tour.tour_title === tour.source_tour_id) ? found : undefined;
  const itinerary = bookingItinerary.length
    ? bookingItinerary
    : (catalogue?.stops ?? []).map((s, i) => ({ order: i + 1, label: s.label, note: s.story || null, durationMinutes: null }));
  const included = bookingIncluded.length ? bookingIncluded : [...(catalogue?.included ?? [])];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/guide" className="text-sm text-[color:var(--teal)]">← My Tours</Link>
        <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tour Details</p>
        <p className="mt-1 font-[family-name:var(--font-editorial)] text-[26px] font-medium leading-tight">{new Date(`${tour.tour_date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {tour.start_time?.slice(0, 5) ?? "Time not set"}</p>
        <h1 className="mt-2 text-[20px] font-semibold leading-tight">{tour.tour_title ?? "Tour name not added yet"}</h1>
        <span className={`inline-block mt-2 text-[11px] px-2 py-0.5 ${b.cls}`}>{b.label}</span>
      </div>
      <TourEssentials t={tour} />
      <GuestActions t={tour} />
      {tour.guest_email && (
        <a href={`mailto:${tour.guest_email}`} className="flex min-h-12 items-center justify-between border border-border px-3 text-sm">
          <span className="min-w-0 truncate">Email {tour.guest_email}</span><span aria-hidden>→</span>
        </a>
      )}

      <Section title="Itinerary">
        {itinerary.length > 0 ? (
          <ol className="space-y-2">
            {itinerary.map((s, i) => (
              <li key={i} className="border-l-2 border-[color:var(--teal)] pl-3 text-sm">
                <span className="font-medium">{s.order ?? i + 1}. {s.label}</span>
                {s.note && <span className="block text-muted-foreground">{s.note}</span>}
              </li>
            ))}
          </ol>
        ) : <Fallback>No itinerary details added yet.</Fallback>}
      </Section>

      <Section title="Special requests / guest notes">
        {tour.client_notes ? (
          <p className="text-sm border-l-2 border-[color:var(--gold)] pl-3 whitespace-pre-line">{tour.client_notes}</p>
        ) : <Fallback>No special requests.</Fallback>}
      </Section>

      <Section title="Included items">
        {included.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {included.map((item, i) => <li key={i} className="border-l-2 border-border pl-3">{item}</li>)}
          </ul>
        ) : <Fallback>No included items added yet.</Fallback>}
      </Section>

      <Section title="Office notes">
        {notes.length === 0 ? (
          <Fallback>No notes from the office.</Fallback>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <p key={n.id} className={`text-sm border-l-2 pl-3 ${n.priority === "critical" ? "border-destructive" : n.priority === "important" ? "border-[color:var(--gold)]" : "border-border"}`}>
                {n.priority !== "normal" && <span className="block text-[11px] uppercase tracking-[0.14em] text-destructive">{n.priority === "critical" ? "Urgent" : "Important"}</span>}
                {n.note}
              </p>
            ))}
          </div>
        )}
      </Section>

      {!tour.booking_cancelled && (
        <div className="space-y-3">
          <p className="text-sm text-[color:var(--teal)]">Scheduled — this tour is on your schedule.</p>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[12px] uppercase tracking-[0.18em] font-medium mb-2">{title}</h2>
      {children}
    </section>
  );
}
function Fallback({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
