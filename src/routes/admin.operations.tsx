/**
 * /admin/operations — Operations dashboard, master calendar, assignment,
 * availability, notes, alerts and activity. Conflicts are enforced by the
 * database; this page only displays and requests changes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  addOperationalNote,
  assignGuide,
  getOperationsBoard,
  removeAssignment,
  resendNotification,
  resolveIssue,
  setGuideAvailability,
} from "@/lib/operations.functions";

export const Route = createFileRoute("/admin/operations")({
  component: OperationsPage,
  head: () => ({
    meta: [{ title: "Operations · Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type Board = Awaited<ReturnType<typeof getOperationsBoard>>;
type View = "dashboard" | "calendar" | "availability" | "activity";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const fmtDay = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  unassigned: { label: "Unassigned", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  assigned: { label: "Awaiting guide", cls: "bg-[color:var(--gold)]/15 text-[color:var(--charcoal)] border-[color:var(--gold)]/40" },
  changed: { label: "Changed", cls: "bg-[color:var(--gold)]/25 text-[color:var(--charcoal)] border-[color:var(--gold)]" },
  confirmed: { label: "Confirmed", cls: "bg-[color:var(--teal)]/10 text-[color:var(--teal)] border-[color:var(--teal)]/30" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border line-through" },
};

function OperationsPage() {
  const load = useServerFn(getOperationsBoard);
  const assign = useServerFn(assignGuide);
  const unassign = useServerFn(removeAssignment);
  const addNote = useServerFn(addOperationalNote);
  const setAvail = useServerFn(setGuideAvailability);
  const resolve = useServerFn(resolveIssue);
  const resend = useServerFn(resendNotification);

  const [view, setView] = useState<View>("dashboard");
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    return iso(addDays(new Date(`${iso(d)}T00:00:00Z`), -((d.getUTCDay() + 6) % 7)));
  });
  const [board, setBoard] = useState<Board | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = iso(new Date());
  const from = useMemo(() => (weekStart < today ? weekStart : today), [weekStart, today]);
  const to = useMemo(() => iso(addDays(new Date(`${weekStart}T00:00:00Z`), 27)), [weekStart]);

  const refresh = useCallback(async () => {
    try {
      setBoard(await load({ data: { from, to } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load operations");
    }
  }, [load, from, to]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const derived = useMemo(() => {
    if (!board) return null;
    const guideById = new Map(board.guides.map((g: any) => [g.id, g]));
    const asgByBooking = new Map(board.assignments.map((a: any) => [a.booking_id, a]));
    const rows = board.bookings.map((b: any) => {
      const a: any = asgByBooking.get(b.id);
      const cancelled = b.status === "cancelled" || !!b.cancelled_at;
      const status = cancelled ? "cancelled" : !a ? "unassigned" : a.status === "confirmed" ? "confirmed" : a.status === "changed" ? "changed" : "assigned";
      return { b, a, status, guide: a ? (guideById.get(a.guide_id) as any) : null };
    });
    const soon = iso(addDays(new Date(), 2));
    const alerts = rows.filter(
      (r: any) => r.status !== "cancelled" && r.b.preferred_date >= today && r.b.preferred_date <= soon && r.status !== "confirmed",
    );
    return { guideById, rows, alerts };
  }, [board, today]);

  const tabs: { id: View; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "calendar", label: "Calendar" },
    { id: "availability", label: "Availability" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <AdminShell eyebrow="Operations" title="Operations">
      <div className="flex gap-1 overflow-x-auto border-b border-border mb-6" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setView(t.id)}
            className={`min-h-11 px-4 text-[12px] uppercase tracking-[0.18em] border-b-2 -mb-px ${
              view === t.id ? "border-[color:var(--teal)] text-[color:var(--teal)]" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!board || !derived ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : view === "dashboard" ? (
        <div className="space-y-8">
          <Stat
            items={[
              ["Unassigned", derived.rows.filter((r: any) => r.status === "unassigned").length],
              ["Awaiting guide", derived.rows.filter((r: any) => r.status === "assigned" || r.status === "changed").length],
              ["Confirmed", derived.rows.filter((r: any) => r.status === "confirmed").length],
              ["Open issues", board.issues.length],
            ]}
          />
          {board.issues.length > 0 && (
            <Section title="Reported by guides">
              {board.issues.map((i: any) => (
                <div key={i.id} className="border border-destructive/30 p-3 flex justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{(derived.guideById.get(i.guide_id) as any)?.name ?? "Guide"}</p>
                    <p className="text-muted-foreground">{i.message}</p>
                  </div>
                  <button disabled={busy} className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--teal)]" onClick={() => run(() => resolve({ data: { id: i.id } }), "Resolved")}>
                    Resolve
                  </button>
                </div>
              ))}
            </Section>
          )}
          <Section title="Needs attention · next 2 days">
            {derived.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything in the next two days is confirmed.</p>
            ) : (
              derived.alerts.map((r: any) => <BookingRow key={r.b.id} r={r} onOpen={() => setOpenId(r.b.id)} />)
            )}
          </Section>
          {[today, iso(addDays(new Date(), 1))].map((d, i) => (
            <Section key={d} title={i === 0 ? "Today" : "Tomorrow"}>
              {derived.rows.filter((r: any) => r.b.preferred_date === d).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tours.</p>
              ) : (
                derived.rows
                  .filter((r: any) => r.b.preferred_date === d)
                  .map((r: any) => <BookingRow key={r.b.id} r={r} onOpen={() => setOpenId(r.b.id)} />)
              )}
            </Section>
          ))}
        </div>
      ) : view === "calendar" ? (
        <div>
          <WeekNav weekStart={weekStart} setWeekStart={setWeekStart} />
          <div className="grid gap-4 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(`${weekStart}T00:00:00Z`), i))).map((d) => (
              <div key={d} className={`border p-2 min-h-24 ${d === today ? "border-[color:var(--teal)]" : "border-border"}`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{fmtDay(d)}</p>
                <div className="space-y-2">
                  {derived.rows
                    .filter((r: any) => r.b.preferred_date === d)
                    .map((r: any) => (
                      <button key={r.b.id} onClick={() => setOpenId(r.b.id)} className={`w-full text-left border px-2 py-1.5 text-[12px] ${STATUS_STYLE[r.status].cls}`}>
                        <span className="block font-medium truncate">{r.b.start_time ?? "—"} · {r.b.tour_title ?? r.b.source_tour_id}</span>
                        <span className="block truncate">{r.guide?.name ?? "No guide"} · {r.b.guests ?? "?"} pax</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : view === "availability" ? (
        <div>
          <WeekNav weekStart={weekStart} setWeekStart={setWeekStart} />
          <AvailabilityGrid board={board} weekStart={weekStart} busy={busy} onSet={(guideId, date, status) => run(() => setAvail({ data: { guideId, date, status } }), "Availability saved")} />
        </div>
      ) : (
        <Section title="Activity log">
          {board.log.map((l: any) => (
            <div key={l.id} className="text-sm border-b border-border py-2 flex justify-between gap-3">
              <span>
                <strong className="font-medium">{l.action.replace(/_/g, " ")}</strong>
                {l.guide_id ? ` · ${(derived.guideById.get(l.guide_id) as any)?.name ?? ""}` : ""}
              </span>
              <span className="text-muted-foreground text-[12px] whitespace-nowrap">{new Date(l.created_at).toLocaleString("en-GB")}</span>
            </div>
          ))}
        </Section>
      )}

      {openId && derived && board && (
        <BookingPanel
          row={derived.rows.find((r: any) => r.b.id === openId)}
          board={board}
          busy={busy}
          onClose={() => setOpenId(null)}
          onAssign={(guideId) =>
            run(async () => {
              const r = await assign({ data: { bookingId: openId, guideId } });
              const wa = r.whatsappUrl;
              toast(r.emailed ? "Briefing emailed to the guide" : "No guide email on file — briefing not emailed", {
                action: wa ? { label: "Send WhatsApp", onClick: () => window.open(wa, "_blank", "noopener") } : undefined,
                duration: 12000,
              });
            }, "Guide assigned")
          }
          onRemove={() => run(() => unassign({ data: { bookingId: openId } }), "Assignment removed")}
          onResend={() => run(() => resend({ data: { bookingId: openId } }), "Reminder sent")}
          onNote={(note, priority, notify) => run(() => addNote({ data: { bookingId: openId, note, priority, notify } }), "Note saved")}
        />
      )}
    </AdminShell>
  );
}

function Stat({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(([l, n]) => (
        <div key={l} className="border border-border p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{l}</p>
          <p className="font-[family-name:var(--font-editorial)] text-[28px] mt-1">{n}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function BookingRow({ r, onOpen }: { r: any; onOpen: () => void }) {
  const s = STATUS_STYLE[r.status];
  return (
    <button onClick={onOpen} className="w-full text-left border border-border p-3 flex items-center justify-between gap-3 min-h-11">
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate">
          {fmtDay(r.b.preferred_date)} · {r.b.start_time ?? "time tbc"} · {r.b.tour_title ?? r.b.source_tour_id}
        </span>
        <span className="block text-[12px] text-muted-foreground truncate">
          {r.b.customer_name ?? "Guest"} · {r.b.guests ?? "?"} pax · {r.guide?.name ?? "No guide"}
        </span>
      </span>
      <span className={`shrink-0 text-[11px] px-2 py-0.5 border ${s.cls}`}>{s.label}</span>
    </button>
  );
}

function WeekNav({ weekStart, setWeekStart }: { weekStart: string; setWeekStart: (s: string) => void }) {
  const shift = (n: number) => setWeekStart(iso(addDays(new Date(`${weekStart}T00:00:00Z`), n)));
  return (
    <div className="flex items-center justify-between mb-4">
      <button className="min-h-11 px-3 border border-border" onClick={() => shift(-7)} aria-label="Previous week">←</button>
      <p className="text-sm">Week of {fmtDay(weekStart)}</p>
      <button className="min-h-11 px-3 border border-border" onClick={() => shift(7)} aria-label="Next week">→</button>
    </div>
  );
}

function dayStatus(board: Board, guideId: string, date: string): string {
  const busy = board.assignments.some((a: any) => a.guide_id === guideId && a.start_at.slice(0, 10) === date);
  if (busy) return "tour";
  const v: any = board.availability.find((x: any) => x.guide_id === guideId && x.start_at.slice(0, 10) <= date && x.end_at.slice(0, 10) > date);
  if (v) return v.status;
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  const rec: any = board.recurring.find((x: any) => x.guide_id === guideId && x.weekday === wd);
  return rec ? rec.status : "unknown";
}

const CELL: Record<string, string> = {
  tour: "bg-[color:var(--teal)] text-primary-foreground",
  available: "bg-[color:var(--teal)]/15",
  partial: "bg-[color:var(--gold)]/25",
  unavailable: "bg-destructive/15",
  vacation: "bg-destructive/25",
  unknown: "bg-muted",
};
const CYCLE = ["available", "partial", "unavailable", "vacation"] as const;

function AvailabilityGrid({ board, weekStart, busy, onSet }: { board: Board; weekStart: string; busy: boolean; onSet: (g: string, d: string, s: (typeof CYCLE)[number]) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(`${weekStart}T00:00:00Z`), i)));
  return (
    <div className="overflow-x-auto">
      <table className="text-[12px] w-full min-w-[640px]">
        <thead>
          <tr>
            <th className="text-left p-2">Guide</th>
            {days.map((d) => (
              <th key={d} className="p-2 font-normal text-muted-foreground">{fmtDay(d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.guides.filter((g: any) => g.active).map((g: any) => (
            <tr key={g.id} className="border-t border-border">
              <td className="p-2 font-medium">{g.name}{!g.user_id && <span className="block text-[11px] text-muted-foreground font-normal">no app login yet</span>}</td>
              {days.map((d) => {
                const s = dayStatus(board, g.id, d);
                return (
                  <td key={d} className="p-1">
                    <button
                      disabled={busy || s === "tour"}
                      title={s === "tour" ? "Assigned tour — reassign to free this day" : "Tap to change"}
                      onClick={() => onSet(g.id, d, CYCLE[(CYCLE.indexOf(s as any) + 1) % CYCLE.length])}
                      className={`w-full min-h-11 capitalize ${CELL[s]}`}
                    >
                      {s === "unknown" ? "—" : s}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-muted-foreground mt-3">Tap a day to cycle available → partial → unavailable → vacation. Days with a tour are locked.</p>
    </div>
  );
}

function BookingPanel({ row, board, busy, onClose, onAssign, onRemove, onResend, onNote }: {
  row: any; board: Board; busy: boolean; onClose: () => void;
  onAssign: (g: string) => void; onRemove: () => void; onResend: () => void;
  onNote: (n: string, p: "normal" | "important" | "critical", notify: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "critical">("normal");
  const [notify, setNotify] = useState(true);
  if (!row) return null;
  const { b, a } = row;
  const date = b.preferred_date as string;
  const notes = board.notes.filter((n: any) => n.booking_id === b.id);
  const notifs = board.notifications.filter((n: any) => n.booking_id === b.id);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex justify-end" onClick={onClose}>
      <aside className="bg-background w-full max-w-md h-full overflow-y-auto p-5 space-y-6" onClick={(e) => e.stopPropagation()} aria-label="Booking operations">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{fmtDay(date)} · {b.start_time ?? "time tbc"}</p>
            <h2 className="font-[family-name:var(--font-editorial)] text-[24px] leading-tight mt-1">{b.tour_title ?? b.source_tour_id}</h2>
            <p className="text-sm text-muted-foreground mt-1">{b.customer_name} · {b.guests ?? "?"} pax · {b.language ?? "EN"}</p>
            {b.pickup_location && <p className="text-sm mt-1">Pickup: {b.pickup_location}</p>}
          </div>
          <button onClick={onClose} className="min-h-11 min-w-11" aria-label="Close">✕</button>
        </div>

        <Section title="Guide">
          {a && (
            <div className="border border-border p-3 text-sm space-y-1">
              <p className="font-medium">{row.guide?.name}</p>
              <p className="text-muted-foreground">
                Viewed: {a.guide_viewed_at ? new Date(a.guide_viewed_at).toLocaleString("en-GB") : "not yet"} · Confirmed: {a.guide_confirmed_at ? new Date(a.guide_confirmed_at).toLocaleString("en-GB") : "not yet"}
              </p>
              <div className="flex gap-4 pt-1">
                <button disabled={busy} onClick={onResend} className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--teal)]">Resend</button>
                <button disabled={busy} onClick={onRemove} className="text-[11px] uppercase tracking-[0.18em] text-destructive">Remove</button>
              </div>
            </div>
          )}
          {board.guides.filter((g: any) => g.active).map((g: any) => {
            const s = dayStatus(board, g.id, date);
            const mine = a?.guide_id === g.id;
            const blocked = !mine && (s === "tour" || s === "unavailable" || s === "vacation");
            return (
              <button
                key={g.id}
                disabled={busy || blocked || mine}
                onClick={() => onAssign(g.id)}
                className={`w-full min-h-11 border px-3 flex justify-between items-center text-sm ${blocked ? "opacity-50 border-border" : "border-[color:var(--teal)]/40"}`}
              >
                <span>{g.name}</span>
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {mine ? "Assigned" : s === "tour" ? "Busy" : s === "unavailable" || s === "vacation" ? "Not available" : a ? "Reassign" : "Assign"}
                </span>
              </button>
            );
          })}
        </Section>

        <Section title="Operational notes · special requests">
          {b.client_notes && <p className="text-sm border-l-2 border-[color:var(--gold)] pl-3">Guest: {b.client_notes}</p>}
          {notes.map((n: any) => (
            <p key={n.id} className={`text-sm border-l-2 pl-3 ${n.priority === "critical" ? "border-destructive" : n.priority === "important" ? "border-[color:var(--gold)]" : "border-border"}`}>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground block">{n.priority}</span>
              {n.note}
            </p>
          ))}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border border-border p-2 text-sm bg-background" placeholder="Add a note for the guide" />
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="border border-border min-h-11 px-2 bg-background">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
            <label className="flex items-center gap-2 min-h-11">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify guide
            </label>
            <button
              disabled={busy || !note.trim()}
              onClick={() => {
                onNote(note.trim(), priority, notify);
                setNote("");
              }}
              className="min-h-11 px-4 bg-[color:var(--teal)] text-primary-foreground text-[11.5px] uppercase tracking-[0.18em] disabled:opacity-50"
            >
              Save note
            </button>
          </div>
        </Section>

        <Section title="Notifications">
          {notifs.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : notifs.map((n: any) => (
            <p key={n.id} className="text-[12px] flex justify-between gap-2 border-b border-border py-1">
              <span>{n.title}</span>
              <span className="text-muted-foreground">{n.read_at ? "Read" : "Sent"} · {new Date(n.sent_at).toLocaleDateString("en-GB")}</span>
            </p>
          ))}
        </Section>
      </aside>
    </div>
  );
}
