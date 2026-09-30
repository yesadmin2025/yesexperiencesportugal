/**
 * /admin — Today. The owner's morning read: is anything waiting on me?
 *
 * Exceptions first, then today and tomorrow, then the week at a glance.
 * Read-only: every figure comes from existing admin server functions; nothing
 * here writes data. Items that are not safely known are left out.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSectionTitle, AdminShell } from "@/components/admin/AdminShell";
import { getOpsIntegrationStatus, listOpsBookings } from "@/lib/bookingsOps.functions";
import { getOperationsBoard } from "@/lib/operations.functions";

type Avail = { id: string; guide_id: string; status: string; start_at: string; end_at: string };
const AVAIL_LABEL: Record<string, string> = { available: "Free", unavailable: "Busy", vacation: "Vacation", partial: "Partly free", morning: "Free mornings", afternoon: "Free afternoons", custom: "Free some hours" };
const lisbonTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Lisbon", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Operations · YES Admin" }, { name: "description", content: "Today, upcoming tours and what needs attention." }, { property: "og:title", content: "Operations · YES Admin" }, { property: "og:description", content: "Today, upcoming tours and what needs attention." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: TodayPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Could not load Today: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Row = {
  id: string;
  tour_title: string | null;
  source_tour_id: string | null;
  customer_name: string | null;
  customer_email: string;
  guests: number;
  preferred_date: string | null;
  start_time: string | null;
  pickup_location: string | null;
  amount_total: number;
  amount_paid: number | null;
  currency: string;
  status: string;
  payment_status: string | null;
  assigned_guide_id: string | null;
  review_required: boolean;
  review_reason: string | null;
};
type Guide = { id: string; name: string };

const lisbonDay = (offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const active = (row: Row) => row.status !== "cancelled" && row.status !== "refunded" && row.status !== "failed";
const tourOf = (row: Row) => row.tour_title ?? row.source_tour_id ?? null;
const guestOf = (row: Row) => row.customer_name ?? row.customer_email;

type Exception = { key: string; text: string; detail: string; action: string; bookingId?: string; to?: "settings" | "review" };

function TodayPage() {
  const loadBookings = useServerFn(listOpsBookings);
  const loadIntegrations = useServerFn(getOpsIntegrationStatus);
  const loadBoard = useServerFn(getOperationsBoard);
  const [avail, setAvail] = useState<Avail[]>([]);
  const [weekly, setWeekly] = useState<Array<{ id: string; guide_id: string; weekday: number; status: string }>>([]);

  const [week, setWeek] = useState<Row[]>([]);
  const [undated, setUndated] = useState<Row[]>([]);
  const [month, setMonth] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [automationProblem, setAutomationProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = lisbonDay(0);
  const weekEnd = lisbonDay(14);
  const [year, monthIdx] = today.split("-").map(Number);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = `${today.slice(0, 7)}-${String(new Date(Date.UTC(year, monthIdx, 0)).getUTCDate()).padStart(2, "0")}`;

  const refresh = useCallback(async () => {
    try {
      const [weekResult, paidResult, monthResult] = await Promise.all([
        loadBookings({ data: { dateFrom: today, dateTo: weekEnd, status: "all", limit: 300 } }),
        loadBookings({ data: { status: "paid", limit: 500 } }),
        loadBookings({ data: { dateFrom: monthStart, dateTo: monthEnd, status: "paid", limit: 500 } }),
      ]);
      setWeek(((weekResult.bookings ?? []) as unknown as Row[]).filter(active));
      setUndated(((paidResult.bookings ?? []) as unknown as Row[]).filter((row) => !row.preferred_date));
      setMonth((monthResult.bookings ?? []) as unknown as Row[]);
      setGuides((weekResult.guides ?? []) as Guide[]);
      setReviewCount(weekResult.reviewCount ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    }

    try {
      const board = await loadBoard({ data: { from: today, to: weekEnd } });
      setAvail(((board.availability ?? []) as Avail[]).sort((a, b) => a.start_at.localeCompare(b.start_at)));
      setWeekly(((board.recurring ?? []) as Array<{ id: string; guide_id: string; weekday: number; status: string }>).sort((a, b) => a.weekday - b.weekday));
    } catch {
      setAvail([]);
      setWeekly([]);
    }

    try {
      const status = await loadIntegrations({});
      const gmail = (status.state as Array<Record<string, unknown>>).find((entry) => entry["id"] === "gmail_bookings");
      const lastRun = typeof gmail?.["last_run_at"] === "string" ? new Date(gmail["last_run_at"] as string) : null;
      if (status.gmail.configured && gmail?.["last_status"] === "error") {
        setAutomationProblem("The email booking scan reported a problem on its last run.");
      } else if (status.gmail.configured && lastRun && Date.now() - lastRun.getTime() > 60 * 60_000) {
        setAutomationProblem("The email booking scan has not run for over an hour.");
      } else {
        setAutomationProblem(null);
      }
    } catch {
      // Not knowing is not the same as a problem — leave it out.
      setAutomationProblem(null);
    }
    setLoaded(true);
  }, [loadBookings, loadIntegrations, loadBoard, today, weekEnd, monthStart, monthEnd]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const guideName = (id: string | null) => guides.find((guide) => guide.id === id)?.name ?? null;

  const exceptions = useMemo<Exception[]>(() => {
    const out: Exception[] = [];
    if (reviewCount > 0) {
      out.push({
        key: "review",
        text: `${reviewCount} booking message${reviewCount === 1 ? "" : "s"} to decide`,
        detail: "Couldn't be matched with certainty",
        action: "Decide",
        to: "review",
      });
    }
    for (const row of week) {
      const when = row.preferred_date ? dayLabel(row.preferred_date) : "";
      const who = guestOf(row);
      if (row.review_required) {
        out.push({ key: `r-${row.id}`, text: `${who} · ${when}`, detail: row.review_reason ?? "Flagged for a check", action: "Check", bookingId: row.id });
        continue;
      }
      const missing = [!tourOf(row) && "tour", !row.pickup_location && "pickup"].filter(Boolean) as string[];
      if (missing.length) {
        out.push({ key: `m-${row.id}`, text: `${who} · ${when}`, detail: `Missing ${missing.join(" and ")}`, action: "Complete", bookingId: row.id });
      }
      if (!row.assigned_guide_id) {
        out.push({ key: `g-${row.id}`, text: `${tourOf(row) ?? who} · ${when}`, detail: "No guide yet", action: "Assign", bookingId: row.id });
      }
    }
    for (const row of undated.slice(0, 5)) {
      out.push({ key: `d-${row.id}`, text: guestOf(row), detail: "Paid, but no trip date", action: "Complete", bookingId: row.id });
    }
    if (automationProblem) {
      out.push({ key: "auto", text: automationProblem, detail: "Bookings may arrive late", action: "Open", to: "settings" });
    }
    return out;
  }, [week, undated, reviewCount, automationProblem]);

  const todayRows = week.filter((row) => row.preferred_date === today);
  const upcomingRows = week
    .filter((row) => row.preferred_date && row.preferred_date > today)
    .sort((a, b) => `${a.preferred_date}${a.start_time ?? "99"}`.localeCompare(`${b.preferred_date}${b.start_time ?? "99"}`));

  const monthCents = month.reduce((sum, row) => sum + (row.amount_paid ?? row.amount_total ?? 0), 0);
  const currency = (month[0]?.currency ?? "eur").toUpperCase();

  const sentence = !loaded
    ? "Reading today…"
    : [
        todayRows.length === 0 ? "No trips today" : `${todayRows.length} trip${todayRows.length === 1 ? "" : "s"} today`,
        exceptions.length === 0
          ? "nothing needs you — everything is running."
          : `${exceptions.length} thing${exceptions.length === 1 ? "" : "s"} need${exceptions.length === 1 ? "s" : ""} you.`,
      ].join(" · ");

  return (
    <AdminShell eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title="Operations">
      <p
        className={`flex items-center gap-2.5 text-[15px] ${exceptions.length ? "text-[color:var(--charcoal)]" : "text-[color:var(--charcoal-soft)]"}`}
        aria-live="polite"
      >
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${loaded ? (exceptions.length ? "bg-[color:var(--gold)]" : "bg-[color:var(--teal)]") : "bg-[color:var(--sand)]"}`}
        />
        {sentence}
      </p>
      {error ? <p className="mt-2 text-[13px] text-[#9B2C2C]">{error}</p> : null}

      <div className="mt-10 space-y-10">
        <DayBlock title="Today" rows={todayRows} guideName={guideName} empty="No tours today." />
        <DayBlock title="Upcoming · next 14 days" rows={upcomingRows} guideName={guideName} showDate empty="No upcoming tours." />
        <section aria-label="Guide availability">
          <AdminSectionTitle count={avail.length}>Guide availability · next 14 days</AdminSectionTitle>
          {avail.length === 0 ? (
            <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">No guide has set free or busy times for these days.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
              {avail.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-3 text-[14px]">
                  <span className="text-[color:var(--charcoal)]">
                    <strong className="font-medium">{guideName(a.guide_id) ?? "Guide"}</strong> · {AVAIL_LABEL[a.status] ?? a.status}
                  </span>
                  <span className="text-[13px] text-[color:var(--charcoal-soft)]">
                    {lisbonTime(a.start_at)} – {lisbonTime(a.end_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {weekly.length > 0 ? (
            <>
              <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">Every week</p>
              <ul className="mt-2 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
                {weekly.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-3 text-[14px]">
                    <span className="text-[color:var(--charcoal)]">
                      <strong className="font-medium">{guideName(w.guide_id) ?? "Guide"}</strong> · {AVAIL_LABEL[w.status] ?? w.status}
                    </span>
                    <span className="text-[13px] text-[color:var(--charcoal-soft)]">
                      Every {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][w.weekday] ?? "week"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>

      {loaded ? (
        <section className="mt-10">
          <AdminSectionTitle count={exceptions.length}>Needs attention</AdminSectionTitle>
          {exceptions.length === 0 ? <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">Nothing needs you.</p> : null}
          <ul className="mt-3 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
            {exceptions.slice(0, 8).map((item) => (
              <li key={item.key}>
                <ExceptionLink item={item} />
              </li>
            ))}
          </ul>
          {exceptions.length > 8 ? (
            <Link to="/admin/bookings" search={{ focus: "attention" }} className="mt-2 inline-block text-[12.5px] text-[color:var(--teal)]">
              See all {exceptions.length}
            </Link>
          ) : null}
        </section>
      ) : null}

      {loaded && month.length > 0 ? (
        <p className="mt-12 text-[12px] text-[color:var(--charcoal-soft)]">
          This month · {month.length} paid trip{month.length === 1 ? "" : "s"} ·{" "}
          {new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(monthCents / 100)}
        </p>
      ) : null}
    </AdminShell>
  );
}

function ExceptionLink({ item }: { item: Exception }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-[color:var(--charcoal)]">{item.text}</span>
        <span className="block text-[12.5px] text-[color:var(--charcoal-soft)]">{item.detail}</span>
      </span>
      <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-[color:var(--teal)]">{item.action} →</span>
    </>
  );
  const className = "flex min-h-14 items-center gap-3 py-2.5";
  if (item.bookingId) {
    return (
      <Link to="/admin/bookings/$id" params={{ id: item.bookingId }} className={className}>
        {body}
      </Link>
    );
  }
  if (item.to === "settings") {
    return (
      <Link to="/admin/settings" className={className}>
        {body}
      </Link>
    );
  }
  return (
    <Link to="/admin/bookings" search={{ focus: "attention" }} className={className}>
      {body}
    </Link>
  );
}

function DayBlock({ title, rows, guideName, showDate = false, empty }: { title: string; rows: Row[]; guideName: (id: string | null) => string | null; showDate?: boolean; empty: string }) {
  const sorted = showDate ? rows : [...rows].sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
  return (
    <section>
      <AdminSectionTitle count={rows.length}>{title}</AdminSectionTitle>
      {sorted.length === 0 ? (
        <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {sorted.map((row) => (
            <li key={row.id}>
              <Link
                to="/admin/bookings/$id"
                params={{ id: row.id }}
                className="flex min-h-11 items-baseline gap-3 rounded-md py-2 text-[13.5px] hover:bg-[color:var(--sand)]/60"
              >
                <span className={`${showDate ? "w-20" : "w-12"} shrink-0 tabular-nums text-[color:var(--charcoal-soft)]`}>{showDate && row.preferred_date ? <span className="block text-[12px]">{dayLabel(row.preferred_date)}</span> : null}{row.start_time ?? "—"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[color:var(--charcoal)]">{tourOf(row) ?? "Tour to confirm"}</span>
                  <span className="block truncate text-[12px] text-[color:var(--charcoal-soft)]">
                    {guestOf(row)} · {row.guests} guest{row.guests === 1 ? "" : "s"}
                    {row.pickup_location ? ` · ${row.pickup_location}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-[11.5px] ${row.assigned_guide_id ? "text-[color:var(--charcoal-soft)]" : "text-[#8A6B23]"}`}>
                  {guideName(row.assigned_guide_id) ?? "No guide"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
