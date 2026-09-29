import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { db, errMsg, fetchMyTours, fmtDate, todayIso } from "@/components/guide/guide-data";

export const Route = createFileRoute("/guide/availability")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.from) ? s.from : undefined,
    to: typeof s.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.to) ? s.to : undefined,
  }),
  head: () => ({ meta: [{ title: "Availability · YES Guide" }] }),
  component: GuideAvailability,
});

const STATUSES = ["available", "unavailable", "vacation", "morning", "afternoon", "custom"] as const;
const STATUS_LABELS: Record<string, string> = {
  available: "Available", unavailable: "Unavailable", vacation: "Vacation",
  morning: "Morning only", afternoon: "Afternoon only", custom: "Custom hours", partial: "Partial",
};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Row = { id: string; start_at: string; end_at: string; status: string; note: string | null };
type Rec = { id: string; weekday: number; status: string };

function GuideAvailability() {
  const search = Route.useSearch();
  const [gid, setGid] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [rec, setRec] = useState<Rec[]>([]);
  const [tourDays, setTourDays] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(search.from ?? todayIso());
  const [to, setTo] = useState(search.to ?? search.from ?? todayIso());
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("unavailable");
  const [customFrom, setCustomFrom] = useState("09:00");
  const [customTo, setCustomTo] = useState("17:00");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: id } = await db.rpc("current_guide_id");
    setGid(id);
    const [a, r, t] = await Promise.all([
      db.from("guide_availability").select("id, start_at, end_at, status, note").gte("end_at", new Date().toISOString()).order("start_at"),
      db.from("guide_recurring_availability").select("id, weekday, status"),
      fetchMyTours(),
    ]);
    setRows(a.data ?? []);
    setRec(r.data ?? []);
    setTourDays(new Set(t.filter((x) => !x.booking_cancelled).map((x) => x.tour_date)));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw new Error(error.message);
      toast.success(ok);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!gid) return;
    if (to < from) return toast.error("End date is before start date.");
    if (status === "custom" && customTo <= customFrom) return toast.error("Custom end time must be after the start time.");
    const end = new Date(`${to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const note = status === "custom" ? `Custom hours: ${customFrom}–${customTo}` : null;
    void act(
      () => db.from("guide_availability").insert({ guide_id: gid, start_at: `${from}T00:00:00+00:00`, end_at: end.toISOString(), status, note }),
      "Availability saved",
    );
  };

  const setWeekday = (weekday: number, s: string) => {
    if (!gid) return;
    const existing = rec.find((r) => r.weekday === weekday);
    if (s === "none") return void act(() => db.from("guide_recurring_availability").delete().eq("id", existing?.id ?? ""), "Weekly pattern updated");
    void act(
      () => db.from("guide_recurring_availability").upsert({ guide_id: gid, weekday, status: s }, { onConflict: "guide_id,weekday" }),
      "Weekly pattern updated",
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Set dates</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px]">From<input type="date" value={from} min={todayIso()} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full min-h-11 border border-border px-2 bg-background" /></label>
          <label className="text-[12px]">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full min-h-11 border border-border px-2 bg-background" /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`min-h-11 border capitalize text-sm ${status === s ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10" : "border-border"}`}>{s}</button>
          ))}
        </div>
        <button disabled={busy} onClick={save} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">Save</button>
        <p className="text-[12px] text-muted-foreground">Days with a tour assigned to you can't be marked unavailable here — use "Report an issue" on the tour.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Upcoming</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing set.</p>}
        {rows.map((r) => {
          const d = r.start_at.slice(0, 10);
          const locked = tourDays.has(d);
          return (
            <div key={r.id} className="border border-border p-3 flex justify-between items-center text-sm">
              <span><span className="capitalize font-medium">{r.status}</span> · {fmtDate(d)}{r.end_at.slice(0, 10) > new Date(new Date(`${d}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10) ? ` → ${fmtDate(new Date(new Date(r.end_at).getTime() - 1).toISOString().slice(0, 10))}` : ""}</span>
              {!locked && (
                <button disabled={busy} onClick={() => act(() => db.from("guide_availability").delete().eq("id", r.id), "Removed")} className="text-[11px] uppercase tracking-[0.18em] text-destructive min-h-11 px-2">Remove</button>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Every week</h2>
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <label key={wd} className="flex items-center justify-between border border-border px-3 min-h-12 text-sm">
            {WEEKDAYS[wd]}
            <select disabled={busy} value={rec.find((r) => r.weekday === wd)?.status ?? "none"} onChange={(e) => setWeekday(wd, e.target.value)} className="min-h-10 bg-background border border-border px-2">
              <option value="none">Not set</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
        ))}
      </section>
    </div>
  );
}
