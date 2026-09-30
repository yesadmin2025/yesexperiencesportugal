import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyTours, fmtDate, type GuideTour } from "@/components/guide/guide-data";
import { TourCard } from "@/components/guide/TourCard";

export const Route = createFileRoute("/guide/")({
  head: () => ({ meta: [{ title: "Today · YES Guide" }] }),
  component: GuideToday,
});

/** Local (Portugal) calendar date, not UTC. */
function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function GuideToday() {
  const [tours, setTours] = useState<GuideTour[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetchMyTours().then(setTours).catch((e) => setErr(e.message));
  }, []);
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!tours) return <p className="text-sm text-muted-foreground">Loading your tours…</p>;

  const today = localIso();
  const active = tours.filter((t) => !t.booking_cancelled);
  const todays = active.filter((t) => t.tour_date === today);
  const next = active
    .filter((t) => t.tour_date > today)
    .sort((a, b) => (a.tour_date + (a.start_time ?? "")).localeCompare(b.tour_date + (b.start_time ?? "")))[0];
  const toConfirm = active.filter((t) => t.tour_date >= today && !t.guide_confirmed_at).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-editorial)] text-[28px] leading-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{fmtDate(today)}</p>
      </div>
      {toConfirm > 0 && (
        <p className="bg-destructive/10 text-destructive text-sm p-3">
          {toConfirm} tour{toConfirm > 1 ? "s" : ""} waiting for your confirmation. Open the tour and tap Confirm.
        </p>
      )}
      {todays.length ? (
        <div className="space-y-4">{todays.map((t) => <TourCard key={t.assignment_id} t={t} />)}</div>
      ) : (
        <p className="border border-border p-4 text-sm">No tours assigned for today.</p>
      )}
      {!todays.length && next && (
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Your next tour</h2>
          <TourCard t={next} />
        </section>
      )}
    </div>
  );
}
