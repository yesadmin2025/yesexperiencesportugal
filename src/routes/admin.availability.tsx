import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours } from "@/data/signatureTours";
import {
  buildMonthGrid,
  normaliseBlackoutDates,
  normaliseWeekdays,
  toggleBlackoutDate,
  toggleOperatingWeekday,
} from "@/lib/admin-availability-calendar";

export const Route = createFileRoute("/admin/availability")({
  head: () => ({
    meta: [
      { title: "Availability calendar — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAvailabilityPage,
  errorComponent: AdminAvailabilityError,
});

type RuleRow = {
  tour_id: string;
  weekdays: number[] | null;
  blackout_dates: string[] | null;
  min_lead_hours: number | null;
  cutoff_local_time: string | null;
  updated_at?: string | null;
};

type RuleDraft = {
  weekdays: number[];
  blackoutDates: string[];
  minLeadHours: number;
  cutoffLocalTime: string | null;
};

const DEFAULT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [
  { js: 1, short: "Mon" },
  { js: 2, short: "Tue" },
  { js: 3, short: "Wed" },
  { js: 4, short: "Thu" },
  { js: 5, short: "Fri" },
  { js: 6, short: "Sat" },
  { js: 0, short: "Sun" },
] as const;
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

function AdminAvailabilityError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Availability calendar failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    </SiteLayout>
  );
}

function draftFromRow(row: RuleRow | undefined): RuleDraft {
  return {
    weekdays: row ? normaliseWeekdays(row.weekdays) : [...DEFAULT_WEEKDAYS],
    blackoutDates: row ? normaliseBlackoutDates(row.blackout_dates) : [],
    minLeadHours:
      row && typeof row.min_lead_hours === "number" && Number.isFinite(row.min_lead_hours)
        ? Math.max(0, Math.round(row.min_lead_hours))
        : 24,
    cutoffLocalTime: row?.cutoff_local_time ?? null,
  };
}

function draftKey(draft: RuleDraft): string {
  return JSON.stringify({
    weekdays: normaliseWeekdays(draft.weekdays),
    blackoutDates: normaliseBlackoutDates(draft.blackoutDates),
    minLeadHours: Math.max(0, Math.round(draft.minLeadHours)),
    cutoffLocalTime: draft.cutoffLocalTime,
  });
}

function AdminAvailabilityPage() {
  const tours = useMemo(
    () => [...signatureTours].sort((a, b) => a.title.localeCompare(b.title)),
    [],
  );
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rules, setRules] = useState<Record<string, RuleRow>>({});
  const [selectedTourId, setSelectedTourId] = useState(
    () => tours.find((t) => t.id === "arrabida-wine-allinclusive")?.id ?? tours[0]?.id ?? "",
  );
  const now = new Date();
  const [monthCursor, setMonthCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [draft, setDraft] = useState<RuleDraft>(() => draftFromRow(undefined));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSession(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setAuthChecked(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setRulesLoading(true);
    supabase
      .from("tour_operating_rules")
      .select("tour_id,weekdays,blackout_dates,min_lead_hours,cutoff_local_time,updated_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error(`Could not load availability: ${error.message}`);
          setRulesLoading(false);
          return;
        }
        const next: Record<string, RuleRow> = {};
        for (const row of data ?? []) next[row.tour_id] = row as RuleRow;
        setRules(next);
        setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    setDraft(draftFromRow(rules[selectedTourId]));
  }, [rules, selectedTourId]);

  const original = useMemo(() => draftFromRow(rules[selectedTourId]), [rules, selectedTourId]);
  const dirty = draftKey(draft) !== draftKey(original);
  const cells = useMemo(
    () => buildMonthGrid(monthCursor.year, monthCursor.month),
    [monthCursor.month, monthCursor.year],
  );
  const blackoutSet = useMemo(() => new Set(draft.blackoutDates), [draft.blackoutDates]);
  const selectedTour = tours.find((t) => t.id === selectedTourId);

  function moveMonth(delta: number) {
    setMonthCursor((current) => {
      const d = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  async function saveRule() {
    if (!selectedTourId) return;
    setSaving(true);
    try {
      const payload = {
        tour_id: selectedTourId,
        weekdays: normaliseWeekdays(draft.weekdays),
        blackout_dates: normaliseBlackoutDates(draft.blackoutDates),
        min_lead_hours: Math.max(0, Math.round(draft.minLeadHours)),
        cutoff_local_time: draft.cutoffLocalTime,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("tour_operating_rules")
        .upsert(payload, { onConflict: "tour_id" })
        .select("tour_id,weekdays,blackout_dates,min_lead_hours,cutoff_local_time,updated_at")
        .single();
      if (error) throw error;
      setRules((prev) => ({ ...prev, [selectedTourId]: data as RuleRow }));
      toast.success(`Availability saved for ${selectedTour?.title ?? selectedTourId}`);
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function resetRule() {
    if (!selectedTourId || !rules[selectedTourId]) {
      setDraft(draftFromRow(undefined));
      return;
    }
    const ok = window.confirm(
      `Reset ${selectedTour?.title ?? selectedTourId} to default availability? This removes all custom blackouts, weekday closures and lead-time overrides.`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tour_operating_rules")
        .delete()
        .eq("tour_id", selectedTourId);
      if (error) throw error;
      setRules((prev) => {
        const next = { ...prev };
        delete next[selectedTourId];
        return next;
      });
      setDraft(draftFromRow(undefined));
      toast.success("Availability reset to defaults");
    } catch (error) {
      toast.error(`Reset failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-6xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Availability calendar</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">Sign in to manage availability.</p>
          <Link
            to="/auth"
            className="mt-6 inline-flex bg-[color:var(--charcoal)] px-5 py-2.5 text-sm text-[color:var(--ivory)]"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Not authorized</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            This page requires the admin role.
          </p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-6xl">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link to="/admin" className="text-xs uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]">
                ← Admin
              </Link>
              <h1 className="mt-2 text-3xl tracking-tight">Availability calendar</h1>
              <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal-soft)]">
                Close dates, choose operating weekdays and set minimum booking notice. Changes are
                saved per Signature and enforced by checkout. Studio keeps its separate 3-day minimum.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetRule}
                disabled={saving || (!rules[selectedTourId] && !dirty)}
                className="inline-flex min-h-11 items-center gap-2 border border-[color:var(--border)] px-4 text-xs uppercase tracking-[0.14em] disabled:opacity-40"
              >
                <Trash2 size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={saveRule}
                disabled={!dirty || saving}
                className="inline-flex min-h-11 items-center gap-2 bg-[color:var(--charcoal)] px-5 text-xs uppercase tracking-[0.14em] text-[color:var(--ivory)] disabled:opacity-40"
              >
                <Save size={14} /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="border border-[color:var(--border)] bg-white p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                    Signature
                  </label>
                  <select
                    value={selectedTourId}
                    onChange={(e) => setSelectedTourId(e.target.value)}
                    className="mt-1 min-h-11 max-w-full border border-[color:var(--border)] bg-white px-3 text-sm"
                  >
                    {tours.map((tour) => (
                      <option key={tour.id} value={tour.id}>
                        {tour.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    className="grid size-11 place-items-center border border-[color:var(--border)]"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <p className="min-w-40 text-center text-sm font-medium">
                    {MONTHS[monthCursor.month]} {monthCursor.year}
                  </p>
                  <button
                    type="button"
                    onClick={() => moveMonth(1)}
                    className="grid size-11 place-items-center border border-[color:var(--border)]"
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {rulesLoading ? (
                <p className="mt-8 text-sm text-[color:var(--charcoal-soft)]">Loading rules…</p>
              ) : (
                <div className="mt-6">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day.js}
                        className="pb-2 text-center text-[10px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]"
                      >
                        {day.short}
                      </div>
                    ))}
                    {cells.map((cell) => {
                      const closed = blackoutSet.has(cell.iso);
                      const weekdayOpen = draft.weekdays.includes(cell.weekday);
                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          disabled={!cell.inMonth}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              blackoutDates: toggleBlackoutDate(prev.blackoutDates, cell.iso),
                            }))
                          }
                          aria-pressed={closed}
                          aria-label={`${cell.iso}: ${closed ? "closed" : weekdayOpen ? "open" : "weekday closed"}`}
                          className={`min-h-16 border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${
                            !cell.inMonth
                              ? "cursor-default border-transparent opacity-25"
                              : closed
                                ? "border-amber-400 bg-amber-50"
                                : weekdayOpen
                                  ? "border-[color:var(--border)] bg-white hover:border-[color:var(--gold)]"
                                  : "border-[color:var(--border)] bg-[color:var(--sand)] opacity-65"
                          }`}
                        >
                          <span className="block text-xs tabular-nums">{cell.day}</span>
                          {cell.inMonth ? (
                            <span className="mt-2 hidden text-[9px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] sm:block">
                              {closed ? "Closed" : weekdayOpen ? "Open" : "Weekday off"}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
                    Click a date to toggle an explicit blackout. Weekday closures are shown separately
                    and apply every week.
                  </p>
                </div>
              )}
            </div>

            <aside className="border border-[color:var(--border)] bg-white p-5">
              <h2 className="text-sm font-semibold">Operating rules</h2>
              <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                {rules[selectedTourId] ? "Custom rule saved" : "Using defaults until you save"}
              </p>

              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  Operating weekdays
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {WEEKDAYS.map((day) => {
                    const active = draft.weekdays.includes(day.js);
                    return (
                      <button
                        key={day.js}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            weekdays: toggleOperatingWeekday(prev.weekdays, day.js),
                          }))
                        }
                        className={`min-h-11 border px-3 text-xs ${
                          active
                            ? "border-[color:var(--charcoal)] bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                            : "border-[color:var(--border)] bg-white"
                        }`}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                {draft.weekdays.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700">All weekdays are closed.</p>
                ) : null}
              </div>

              <label className="mt-6 block">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  Minimum notice
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.minLeadHours}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        minLeadHours: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="min-h-11 w-24 border border-[color:var(--border)] px-3 text-sm tabular-nums"
                  />
                  <span className="text-xs text-[color:var(--charcoal-soft)]">hours</span>
                </div>
              </label>

              <div className="mt-6 border-t border-[color:var(--border)] pt-4 text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
                <p>{draft.blackoutDates.length} explicit closed date{draft.blackoutDates.length === 1 ? "" : "s"}.</p>
                <p className="mt-2">
                  Cutoff time is intentionally not editable yet because checkout does not currently use
                  that field. No decorative controls with fake authority.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
