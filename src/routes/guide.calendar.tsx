import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, fetchMyTours, todayIso, type GuideTour } from "@/components/guide/guide-data";

export const Route = createFileRoute("/guide/calendar")({
  head: () => ({ meta: [{ title: "Calendar · YES Guide" }] }),
  component: GuideCalendar,
});

type Avail = { start_at: string; end_at: string; status: string };

function GuideCalendar() {
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [tours, setTours] = useState<GuideTour[]>([]);
  const [avail, setAvail] = useState<Avail[]>([]);
  useEffect(() => {
    fetchMyTours().then(setTours).catch(() => undefined);
    db.from("guide_availability").select("start_at, end_at, status").then((r: { data: Avail[] | null }) => setAvail(r.data ?? []));
  }, []);

  const days = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const lead = (first.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  const shift = (n: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const today = todayIso();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="min-h-11 min-w-11 border border-border" onClick={() => shift(-1)} aria-label="Previous month">←</button>
        <p className="font-[family-name:var(--font-editorial)] text-[20px]">
          {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <button className="min-h-11 min-w-11 border border-border" onClick={() => shift(1)} aria-label="Next month">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const t = tours.find((x) => x.tour_date === d);
          const a = avail.find((x) => x.start_at.slice(0, 10) <= d && x.end_at.slice(0, 10) > d);
          const cls = t
            ? "bg-[color:var(--teal)] text-primary-foreground"
            : a?.status === "unavailable" || a?.status === "vacation"
              ? "bg-destructive/15"
              : a?.status === "available"
                ? "bg-[color:var(--teal)]/10"
                : "bg-muted/50";
          const inner = <span className={`aspect-square grid place-items-center text-sm ${cls} ${d === today ? "ring-2 ring-[color:var(--gold)]" : ""}`}>{Number(d.slice(8))}</span>;
          return t ? (
            <Link key={d} to="/guide/tours/$assignmentId" params={{ assignmentId: t.assignment_id }} aria-label={`${d} tour`}>{inner}</Link>
          ) : (
            <span key={d}>{inner}</span>
          );
        })}
      </div>
      <p className="text-[12px] text-muted-foreground">Dark teal = your tour · light teal = available · red = unavailable.</p>
    </div>
  );
}
