import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, fetchMyTours, todayIso, type GuideTour } from "@/components/guide/guide-data";
import { MonthCalendar, type CalendarDayTone } from "@/components/calendar/MonthCalendar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide/calendar")({
  head: () => ({ meta: [
    { title: "My tour calendar · YES Guide" },
    { name: "description", content: "Private calendar for a YES Experiences guide's assigned tours and availability." },
    { property: "og:title", content: "My tour calendar · YES Guide" },
    { property: "og:description", content: "Private calendar for a YES Experiences guide's assigned tours and availability." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GuideCalendar,
});

type Avail = { start_at: string; end_at: string; status: string };

function GuideCalendar() {
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [selected, setSelected] = useState(todayIso());
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
    return [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: count }, (_, i) => {
        const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
        const dayTours = tours.filter((tour) => tour.tour_date === iso && !tour.booking_cancelled);
        const availability = avail.find((item) => item.start_at.slice(0, 10) <= iso && item.end_at.slice(0, 10) > iso);
        let tone: CalendarDayTone = "default";
        if (dayTours.length) tone = "tour";
        else if (availability?.status === "available") tone = "available";
        else if (availability?.status === "unavailable" || availability?.status === "vacation") tone = "unavailable";
        return { iso, day: i + 1, tone, count: dayTours.length || undefined, label: `${iso}: ${dayTours.length ? `${dayTours.length} tour${dayTours.length > 1 ? "s" : ""}` : availability?.status ?? "no status"}` };
      }),
    ];
  }, [avail, month, tours]);

  const shift = (n: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    const nextMonth = d.toISOString().slice(0, 7);
    setMonth(nextMonth);
    setSelected(`${nextMonth}-01`);
  };
  const today = todayIso();
  const selectedTours = tours.filter((tour) => tour.tour_date === selected && !tour.booking_cancelled);
  const selectedAvailability = avail.find((item) => item.start_at.slice(0, 10) <= selected && item.end_at.slice(0, 10) > selected);
  const selectToday = () => {
    setMonth(today.slice(0, 7));
    setSelected(today);
  };

  return (
    <div className="space-y-5">
      <MonthCalendar
        monthLabel={new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        days={days}
        selected={selected}
        today={today}
        onSelect={setSelected}
        onPrevious={() => shift(-1)}
        onNext={() => shift(1)}
        onToday={selectToday}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Calendar key">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-primary" />Tour</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 border border-primary/25 bg-primary/10" />Available</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-destructive/10" />Unavailable</span>
      </div>

      <section className="border-t border-border pt-5" aria-live="polite">
        <p className="text-[11px] uppercase text-muted-foreground">Selected day</p>
        <h1 className="mt-1 font-[family-name:var(--font-editorial)] text-[24px]">
          {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </h1>
        {selectedTours.length ? (
          <div className="mt-3 space-y-2">
            {selectedTours.map((tour) => (
              <Button key={tour.assignment_id} asChild variant="outline" className="h-auto min-h-14 w-full justify-between whitespace-normal px-3 py-3 text-left">
                <Link to="/guide/tours/$assignmentId" params={{ assignmentId: tour.assignment_id }}>
                  <span><strong className="block">{tour.tour_title}</strong><span className="text-xs text-muted-foreground">{tour.start_time?.slice(0, 5) ?? "Time not set"}</span></span>
                  <span aria-hidden>→</span>
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground capitalize">{selectedAvailability?.status ?? "No tour assigned"}.</p>
        )}
      </section>
    </div>
  );
}
