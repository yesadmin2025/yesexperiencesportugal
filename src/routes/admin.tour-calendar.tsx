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
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const dayList = selected ? byDay.get(selected) ?? [] : [];

  return (
    <AdminShell eyebrow="Operations" title="Tour calendar">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="min-h-11 px-3 text-sm" aria-label="Previous month">←</button>
        <p className="text-base font-semibold">{label}</p>
        <button onClick={() => shift(1)} className="min-h-11 px-3 text-sm" aria-label="Next month">→</button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const list = byDay.get(d) ?? [];
          const isFull = full.has(d);
          const tone = isFull
            ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
            : list.length
              ? "bg-[color:var(--teal)] text-[color:var(--ivory)]"
              : "bg-[color:var(--ivory)] text-[color:var(--charcoal)]";
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`flex min-h-12 flex-col items-center justify-center border border-[color:var(--border)] text-sm ${tone} ${selected === d ? "ring-2 ring-[color:var(--gold)]" : ""}`}
            >
              {Number(d.slice(8))}
              {list.length > 0 && <span className="text-[11px]">{list.length}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--charcoal-soft)]">
        <span>□ Free</span>
        <span className="text-[color:var(--teal)]">■ Booked</span>
        <span className="text-[color:var(--charcoal)]">■ Full (no guide left)</span>
      </div>

      {selected && (
        <div className="mt-6 border border-[color:var(--border)] bg-white p-4">
          <p className="text-sm font-semibold">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {full.has(selected) ? " · Full" : ""}
          </p>
          {dayList.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">No tours booked. This date is free.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[color:var(--border)]">
              {dayList.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <p className="font-medium">{b.tour_title ?? "Tour"}</p>
                  <p className="text-[color:var(--charcoal-soft)]">
                    {b.start_time ? String(b.start_time).slice(0, 5) : "Time not set"} · {b.guests ?? "?"} guests ·{" "}
                    {assigned.has(b.id) ? "Guide assigned" : "No guide yet"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/operations" className="mt-3 inline-block text-xs uppercase tracking-[0.18em] text-[color:var(--teal)]">
            Assign guides in Operations →
          </Link>
        </div>
      )}
    </AdminShell>
  );
}
