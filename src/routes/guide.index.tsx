import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyTours, fmtDate, todayIso, type GuideTour } from "@/components/guide/guide-data";
import { TourCard } from "@/components/guide/TourCard";

export const Route = createFileRoute("/guide/")({
  head: () => ({ meta: [{ title: "Today · YES Guide" }] }),
  component: GuideToday,
});

function GuideToday() {
  const [tours, setTours] = useState<GuideTour[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetchMyTours().then(setTours).catch((e) => setErr(e.message));
  }, []);
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!tours) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = todayIso();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const todays = tours.filter((t) => t.tour_date === today);
  const tomorrows = tours.filter((t) => t.tour_date === tomorrow);
  const next = tours.find((t) => t.tour_date > tomorrow);
  const toConfirm = tours.filter((t) => t.tour_date >= today && !t.guide_confirmed_at && !t.booking_cancelled).length;

  return (
    <div className="space-y-8">
      {toConfirm > 0 && (
        <p className="bg-destructive/10 text-destructive text-sm p-3">
          {toConfirm} tour{toConfirm > 1 ? "s" : ""} waiting for your confirmation.
        </p>
      )}
      <Block title={`Today · ${fmtDate(today)}`}>
        {todays.length ? todays.map((t) => <TourCard key={t.assignment_id} t={t} big />) : <Empty>No tour today.</Empty>}
      </Block>
      <Block title="Tomorrow">
        {tomorrows.length ? tomorrows.map((t) => <TourCard key={t.assignment_id} t={t} />) : <Empty>No tour tomorrow.</Empty>}
      </Block>
      {next && (
        <Block title={`Next · ${fmtDate(next.tour_date)}`}>
          <TourCard t={next} />
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
