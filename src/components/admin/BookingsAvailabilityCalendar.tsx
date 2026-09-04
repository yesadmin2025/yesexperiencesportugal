/**
 * Admin availability calendar.
 *
 * Read-only view of which dates are already committed, per Signature and per
 * moment (stop). Booked dates come from real reservations (paid + pending);
 * closed weekdays and blackout dates come from `tour_operating_rules` when a
 * single Signature is selected. Nothing here writes or prices anything.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listAdminBookingCalendar } from "@/lib/bookingsAdmin.functions";
import { buildMonthGrid, normaliseBlackoutDates, normaliseWeekdays } from "@/lib/admin-availability-calendar";
import { signatureTours } from "@/data/signatureTours";
import { supabase } from "@/integrations/supabase/client";

type CalendarBooking = {
  id: string;
  preferred_date: string | null;
  source_tour_id: string | null;
  booking_type: string;
  guests: number;
  customer_name: string | null;
  customer_email: string;
  status: string;
  booking_details: Record<string, unknown> | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEK_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Pulls moment/stop labels out of the frozen booking snapshot. Never invents. */
function stopLabels(booking: CalendarBooking): string[] {
  const out: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 4 || out.length > 12 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of ["stops", "moments", "itinerary", "snapshot", "day", "composedStops"]) {
      if (key in record) visit(record[key], depth + 1);
    }
    const label = record["label"] ?? record["name"] ?? record["title"];
    if (typeof label === "string" && label.trim() && !out.includes(label.trim())) {
      out.push(label.trim());
    }
  };
  visit(booking.booking_details, 0);
  return out;
}

function tourTitle(tourId: string | null): string {
  if (!tourId) return "Bespoke day";
  return signatureTours.find((t) => t.id === tourId)?.title ?? tourId;
}

export function BookingsAvailabilityCalendar() {
  const load = useServerFn(listAdminBookingCalendar);
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getUTCMonth());
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [rule, setRule] = useState<{ weekdays: number[]; blackoutDates: string[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const from = cells[0]?.iso ?? `${year}-${pad2(monthIndex + 1)}-01`;
  const to = cells[cells.length - 1]?.iso ?? from;

  useEffect(() => {
    let active = true;
    setLoading(true);
    load({ data: { from, to } })
      .then((res) => {
        if (!active) return;
        setBookings((res.bookings ?? []) as CalendarBooking[]);
        setError(null);
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [from, to, load]);

  useEffect(() => {
    let active = true;
    if (tourFilter === "all") {
      setRule(null);
      return;
    }
    supabase
      .from("tour_operating_rules")
      .select("weekdays, blackout_dates")
      .eq("tour_id", tourFilter)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setRule(
          data
            ? {
                weekdays: normaliseWeekdays(data.weekdays as number[] | null),
                blackoutDates: normaliseBlackoutDates(data.blackout_dates as string[] | null),
              }
            : null,
        );
      });
    return () => {
      active = false;
    };
  }, [tourFilter]);

  const filtered = useMemo(
    () =>
      bookings.filter((b) => tourFilter === "all" || b.source_tour_id === tourFilter),
    [bookings, tourFilter],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of filtered) {
      if (!b.preferred_date) continue;
      const list = map.get(b.preferred_date) ?? [];
      list.push(b);
      map.set(b.preferred_date, list);
    }
    return map;
  }, [filtered]);

  const shift = (delta: number) => {
    const next = new Date(Date.UTC(year, monthIndex + delta, 1));
    setYear(next.getUTCFullYear());
    setMonthIndex(next.getUTCMonth());
    setSelected(null);
  };

  const selectedBookings = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <section className="mt-8 border border-[color:var(--sand)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
          Availability calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
            className="inline-flex h-11 w-11 items-center justify-center border border-[color:var(--sand)]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[9rem] text-center text-sm text-[color:var(--charcoal)]">
            {MONTHS[monthIndex]} {year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="inline-flex h-11 w-11 items-center justify-center border border-[color:var(--sand)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        Signature
        <select
          value={tourFilter}
          onChange={(e) => {
            setTourFilter(e.target.value);
            setSelected(null);
          }}
          className="mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal md:text-sm"
        >
          <option value="all">All signatures &amp; bespoke days</option>
          {[...signatureTours]
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      </label>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
        {WEEK_HEADERS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayBookings = byDate.get(cell.iso) ?? [];
          const closed =
            rule != null &&
            (!rule.weekdays.includes(cell.weekday) || rule.blackoutDates.includes(cell.iso));
          const isSelected = selected === cell.iso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(isSelected ? null : cell.iso)}
              aria-pressed={isSelected}
              aria-label={`${cell.iso}: ${dayBookings.length} booked${closed ? ", closed" : ""}`}
              className={`min-h-11 border p-1 text-left text-xs transition-colors ${
                isSelected
                  ? "border-[color:var(--gold)] bg-[color:var(--sand)]"
                  : "border-[color:var(--sand)]"
              } ${cell.inMonth ? "" : "opacity-40"} ${
                closed ? "bg-[color:var(--sand)]/60 line-through" : ""
              }`}
            >
              <span className="block text-[color:var(--charcoal)]">{cell.day}</span>
              {dayBookings.length > 0 ? (
                <span className="mt-0.5 inline-block rounded-full bg-[color:var(--teal)] px-1.5 text-[10px] text-[color:var(--ivory)]">
                  {dayBookings.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[color:var(--charcoal-soft)]">
        {loading ? "Loading reservations…" : `${filtered.length} reservation(s) this month`}
        {rule ? " · struck-through days are closed for this Signature" : ""}
      </p>

      {selected ? (
        <div className="mt-4 border-t border-[color:var(--sand)] pt-4">
          <h3 className="text-sm text-[color:var(--charcoal)]">{selected}</h3>
          {selectedBookings.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
              No reservations on this date.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {selectedBookings.map((b) => {
                const stops = stopLabels(b);
                return (
                  <li key={b.id} className="text-sm">
                    <span className="text-[color:var(--charcoal)]">
                      {tourTitle(b.source_tour_id)} · {b.guests} guests · {b.status}
                    </span>
                    <span className="block text-[color:var(--charcoal-soft)]">
                      {b.customer_name || b.customer_email}
                    </span>
                    {stops.length > 0 ? (
                      <span className="mt-1 block text-xs text-[color:var(--charcoal-soft)]">
                        Moments booked: {stops.join(" · ")}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
