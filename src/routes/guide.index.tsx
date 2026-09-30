import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fetchMyTours, type GuideTour } from "@/components/guide/guide-data";
import { TourCard } from "@/components/guide/TourCard";
import { Button } from "@/components/ui/button";
import { useGuideRefresh } from "@/components/guide/guide-refresh";

export const Route = createFileRoute("/guide/")({
  head: () => ({ meta: [{ title: "My Tours · YES Guide" }] }),
  component: GuideToursHome,
});

export type GuideAlert = { id: string; title: string; message: string | null; assignment_id: string | null; notification_type: string };

/** Local (Portugal) calendar date, not UTC. */
function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function GuideToursHome() {
  const [tours, setTours] = useState<GuideTour[] | null>(null);
  const [alerts, setAlerts] = useState<GuideAlert[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const version = useGuideRefresh();
  useEffect(() => {
    fetchMyTours().then((t) => { setTours(t); setErr(null); }).catch((e) => setErr(e.message));
    db.from("ops_notifications")
      .select("id, title, message, assignment_id, notification_type")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }: { data: GuideAlert[] | null }) => setAlerts(data ?? []));
  }, [version]);
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!tours) return <p className="text-sm text-muted-foreground">Loading your tours…</p>;

  return <MyToursContent tours={tours} alerts={alerts} today={localIso()} />;
}

export function MyToursContent({ tours, alerts, today }: { tours: GuideTour[]; alerts: GuideAlert[]; today: string }) {
  const [showAll, setShowAll] = useState(false);
  const active = tours.filter((t) => !t.booking_cancelled);
  const todays = active.filter((t) => t.tour_date === today);
  const upcoming = active
    .filter((t) => t.tour_date > today)
    .sort((a, b) => (a.tour_date + (a.start_time ?? "")).localeCompare(b.tour_date + (b.start_time ?? "")));
  const visibleUpcoming = showAll ? upcoming : upcoming.slice(0, 10);
  const firstAlert = alerts[0];

  return (
    <div className="space-y-9">
      <h1 className="font-[family-name:var(--font-editorial)] text-[32px] leading-tight">My Tours</h1>
      {firstAlert ? (
        firstAlert.assignment_id && firstAlert.notification_type !== "assignment_removed" ? (
          <Link to="/guide/tours/$assignmentId" params={{ assignmentId: firstAlert.assignment_id }} className="block border-l-2 border-[color:var(--gold)] bg-muted px-4 py-3 text-sm">
            <strong className="block">{firstAlert.title}</strong>
            {firstAlert.message ? <span className="mt-0.5 block text-muted-foreground">{firstAlert.message}</span> : null}
          </Link>
        ) : (
          <div className="border-l-2 border-[color:var(--gold)] bg-muted px-4 py-3 text-sm">
            <strong className="block">{firstAlert.title}</strong>
            {firstAlert.message ? <span className="mt-0.5 block text-muted-foreground">{firstAlert.message}</span> : null}
          </div>
        )
      ) : null}
      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--teal)]">Today</h2>
        {todays.length ? <div>{todays.map((t) => <TourCard key={t.assignment_id} t={t} />)}</div> : <p className="text-base text-muted-foreground">No tours today.</p>}
      </section>
      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--teal)]">Upcoming</h2>
        {visibleUpcoming.length ? <div>{visibleUpcoming.map((t) => <TourCard key={t.assignment_id} t={t} />)}</div> : <p className="text-base text-muted-foreground">No upcoming tours assigned.</p>}
        {!showAll && upcoming.length > 10 ? <Button variant="ghost" className="mt-4 min-h-11 w-full rounded-none text-[color:var(--teal)]" onClick={() => setShowAll(true)}>Show more</Button> : null}
      </section>
    </div>
  );
}
