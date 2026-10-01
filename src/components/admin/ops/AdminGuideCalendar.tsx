/**
 * Admin guide calendar — any month, past or future. Rescheduling (date, time,
 * guests) and guide changes go through updateOpsBooking, so conflict guards,
 * the assignment sync trigger and guide notifications keep the Guide App
 * calendar current automatically.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MonthCalendar, type CalendarDayTone } from "@/components/calendar/MonthCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOpsBookings, updateOpsBooking } from "@/lib/bookingsOps.functions";

type List = Awaited<ReturnType<typeof listOpsBookings>>;
type Row = List["bookings"][number] & { guests?: number | null };
type Guide = { id: string; name: string | null; active?: boolean | null };

const lisbonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
const inactive = (b: Row) => b.status === "cancelled" || b.status === "refunded" || b.status === "failed";

export function AdminGuideCalendar() {
  const load = useServerFn(listOpsBookings);
  const today = lisbonToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [list, setList] = useState<List | null>(null);
  const [guideFilter, setGuideFilter] = useState("all");

  const refresh = useCallback(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    load({ data: { status: "all", dateFrom: `${month}-01`, dateTo: last, limit: 500 } })
      .then(setList)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load the calendar."));
  }, [load, month]);
  useEffect(refresh, [refresh]);

  const guides = (list?.guides ?? []) as Guide[];
  const rows = ((list?.bookings ?? []) as Row[]).filter((b) => !inactive(b) && (guideFilter === "all" || (guideFilter === "none" ? !b.guide_id : b.guide_id === guideFilter)));

  const days = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const lead = (first.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: count }, (_, i) => {
        const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
        const d = rows.filter((b) => b.preferred_date === iso);
        const guests = d.reduce((n, b) => n + (b.guests ?? 0), 0);
        let tone: CalendarDayTone = "default";
        if (d.length) tone = d.some((b) => !b.guide_id) ? "partial" : "tour";
        return { iso, day: i + 1, tone, count: d.length || undefined, label: `${iso}: ${d.length} tour${d.length === 1 ? "" : "s"}, ${guests} guests` };
      }),
    ];
  }, [month, rows]);

  const shift = (n: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    const m = d.toISOString().slice(0, 7);
    setMonth(m);
    setSelected(`${m}-01`);
  };
  const dayRows = rows.filter((b) => b.preferred_date === selected);

  return (
    <div className="space-y-5">
      <label className="block text-xs text-muted-foreground">
        Guide
        <select value={guideFilter} onChange={(e) => setGuideFilter(e.target.value)} className="mt-1 block h-11 w-full border border-border bg-background px-3 text-sm text-foreground sm:w-64">
          <option value="all">All guides</option>
          <option value="none">Unassigned only</option>
          {guides.filter((g) => g.active !== false).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
      <div className="lg:grid lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-10">
        <div>
          <MonthCalendar
            monthLabel={new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            days={days} selected={selected} today={today} onSelect={setSelected}
            onPrevious={() => shift(-1)} onNext={() => shift(1)}
            onToday={() => { setMonth(today.slice(0, 7)); setSelected(today); }}
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Calendar key">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-primary" />Guide assigned</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 border border-[color:var(--gold)]/50 bg-[color:var(--gold)]/15" />Needs a guide</span>
          </div>
        </div>
        <section className="mt-6 border-t border-border pt-5 lg:mt-0" aria-live="polite">
          <h3 className="font-[family-name:var(--font-editorial)] text-[24px]">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h3>
          {!list ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : null}
          {list && !dayRows.length ? <p className="mt-2 text-sm text-muted-foreground">No tours on this day.</p> : null}
          <ul className="mt-3 space-y-3">
            {dayRows.map((b) => <ScheduleRow key={b.id} row={b} guides={guides} onSaved={refresh} />)}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ScheduleRow({ row, guides, onSaved }: { row: Row; guides: Guide[]; onSaved: () => void }) {
  const save = useServerFn(updateOpsBooking);
  const [date, setDate] = useState(row.preferred_date ?? "");
  const [time, setTime] = useState(row.start_time?.slice(0, 5) ?? "");
  const [guests, setGuests] = useState(String(row.guests ?? ""));
  const [guide, setGuide] = useState(row.guide_id ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = date !== (row.preferred_date ?? "") || time !== (row.start_time?.slice(0, 5) ?? "") || guests !== String(row.guests ?? "") || guide !== (row.guide_id ?? "");

  const submit = async () => {
    setBusy(true);
    try {
      const n = Number(guests);
      await save({ data: {
        id: row.id,
        ...(date !== (row.preferred_date ?? "") && date ? { preferredDate: date } : {}),
        ...(time !== (row.start_time?.slice(0, 5) ?? "") ? { startTime: time || null } : {}),
        ...(guests !== String(row.guests ?? "") && Number.isInteger(n) && n > 0 ? { guests: n } : {}),
        ...(guide !== (row.guide_id ?? "") ? { assignedGuideId: guide || null } : {}),
      } });
      toast.success("Saved — the guide's calendar is updated.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{row.tour_title ?? "Tour"}</p>
          <p className="text-xs text-muted-foreground">{row.customer_name ?? "Guest"} · {row.guests ?? "?"} guest{row.guests === 1 ? "" : "s"}</p>
        </div>
        <Link to="/admin/bookings/$id" params={{ id: row.id }} className="shrink-0 text-xs text-primary underline underline-offset-4">Details</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted-foreground">Date<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11" /></label>
        <label className="text-xs text-muted-foreground">Start<Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-11" /></label>
        <label className="text-xs text-muted-foreground">Guests<Input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-1 h-11" /></label>
        <label className="text-xs text-muted-foreground">Guide
          <select value={guide} onChange={(e) => setGuide(e.target.value)} className="mt-1 block h-11 w-full border border-input bg-background px-2 text-sm text-foreground">
            <option value="">Unassigned</option>
            {guides.filter((g) => g.active !== false || g.id === row.guide_id).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
      </div>
      {dirty ? <Button className="mt-3 h-11 w-full sm:w-auto" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save changes"}</Button> : null}
    </li>
  );
}
