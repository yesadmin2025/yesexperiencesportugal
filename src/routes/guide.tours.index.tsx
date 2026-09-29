import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyTours, fmtDate, todayIso, type GuideTour } from "@/components/guide/guide-data";
import { TourCard } from "@/components/guide/TourCard";

export const Route = createFileRoute("/guide/tours/")({
  head: () => ({ meta: [{ title: "My tours · YES Guide" }] }),
  component: MyTours,
});

function MyTours() {
  const [tours, setTours] = useState<GuideTour[] | null>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    fetchMyTours().then(setTours).catch(() => setTours([]));
  }, []);
  if (!tours) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const today = todayIso();
  const list = tours.filter((t) => (past ? t.tour_date < today : t.tour_date >= today));
  if (past) list.reverse();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 border border-border">
        {[false, true].map((p) => (
          <button key={String(p)} onClick={() => setPast(p)} className={`min-h-11 text-[12px] uppercase tracking-[0.18em] ${past === p ? "bg-[color:var(--teal)] text-primary-foreground" : ""}`}>
            {p ? "Past" : "Upcoming"}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No tours.</p>}
      {list.map((t) => (
        <div key={t.assignment_id}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{fmtDate(t.tour_date)}</p>
          <TourCard t={t} />
        </div>
      ))}
    </div>
  );
}
