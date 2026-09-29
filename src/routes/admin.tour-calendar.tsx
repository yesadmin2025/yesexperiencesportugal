/**
 * /admin/tour-calendar — month view of every booked tour, with days marked
 * free, booked or full (no guide left) before assigning guides.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { getOperationsBoard } from "@/lib/operations.functions";
import { supabase } from "@/integrations/supabase/client";
import { MonthCalendar, type CalendarDayTone } from "@/components/calendar/MonthCalendar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/tour-calendar")({
  component: TourCalendarPage,
  head: () => ({
    meta: [
      { title: "Tour calendar · Admin" },
      { name: "description", content: "Private month view of booked and free tour dates." },
      { property: "og:title", content: "Tour calendar · Admin" },
      { property: "og:description", content: "Private month view of booked and free tour dates." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const pad = (n: number) => String(n).padStart(2, "0");

function TourCalendarPage() {
  const load = useServerFn(getOperationsBoard);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [full, setFull] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = `${month.y}-${pad(month.m + 1)}-01`;
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const to = `${month.y}-${pad(month.m + 1)}-${pad(daysInMonth)}`;

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      load({ data: { from, to } }),
      (supabase as any).rpc("public_fully_booked_dates", { _from: from, _to: to }),
    ])
      .then(([board, fullRes]) => {
        if (!active) return;
        setBookings(board.bookings.filter((b: any) => b.status === "paid" && !b.cancelled_at));
        setAssigned(new Set(board.assignments.map((a: any) => a.booking_id)));
        setFull(new Set(((fullRes.data as string[]) ?? []).map((d) => String(d).slice(0, 10))));
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [from, to, load]);

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const b of bookings) {
      const k = String(b.preferred_date).slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return m;
  }, [bookings]);

  const lead = (new Date(month.y, month.m, 1).getDay() + 6) % 7; // Monday first
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month.y}-${pad(month.m + 1)}-${pad(i + 1)}`),
  ];
  const label = new Date(month.y, month.m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      setSelected(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const dayList = selected ? byDay.get(selected) ?? [] : [];
  const today = new Date().toISOString().slice(0, 10);
  const calendarDays = cells.map((iso) => {
    if (!iso) return null;
    const count = byDay.get(iso)?.length ?? 0;
    const tone: CalendarDayTone = full.has(iso) ? "full" : count ? "tour" : "default";
    return { iso, day: Number(iso.slice(8)), count: count || undefined, tone, label: `${iso}: ${full.has(iso) ? "full" : count ? `${count} booked` : "free"}` };
  });
  const selectToday = () => {
    const d = new Date();
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  return (
    <AdminShell eyebrow="Operations" title="Tour calendar">
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <MonthCalendar monthLabel={label} days={calendarDays} selected={selected ?? ""} today={today} onSelect={setSelected} onPrevious={() => shift(-1)} onNext={() => shift(1)} onToday={selectToday} />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Calendar key">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 border border-border bg-background" />Free</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-primary" />Booked</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-foreground" />Full</span>
      </div>

      {selected && (
        <section className="mt-6 border-t border-border pt-5" aria-live="polite">
          <p className="text-[11px] uppercase text-muted-foreground">Selected day</p>
          <h2 className="mt-1 font-[family-name:var(--font-editorial)] text-[24px]">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {full.has(selected) ? " · Full" : ""}
          </h2>
          {dayList.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">No tours booked. This date is free.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayList.map((b) => (
                <li key={b.id} className="flex min-h-16 items-center justify-between gap-3 border border-border px-3 py-2 text-sm">
                  <div className="min-w-0"><p className="truncate font-medium">{b.tour_title ?? "Tour"}</p><p className="text-xs text-muted-foreground">{b.start_time ? String(b.start_time).slice(0, 5) : "Time not set"} · {b.guests ?? "?"} guests</p></div>
                  <span className={assigned.has(b.id) ? "text-xs text-primary" : "text-xs font-medium text-destructive"}>{assigned.has(b.id) ? "Assigned" : "Needs guide"}</span>
                </li>
              ))}
            </ul>
          )}
          {dayList.length > 0 ? <Button asChild className="mt-4 w-full sm:w-auto"><Link to="/admin/operations">Open Operations</Link></Button> : null}
        </section>
      )}
    </AdminShell>
  );
}
