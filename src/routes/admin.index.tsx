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

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Today · YES Operations" }, { name: "robots", content: "noindex, nofollow" }],
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

  const [week, setWeek] = useState<Row[]>([]);
  const [undated, setUndated] = useState<Row[]>([]);
  const [month, setMonth] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [automationProblem, setAutomationProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = lisbonDay(0);
  const tomorrow = lisbonDay(1);
  const weekEnd = lisbonDay(7);
  const monthStart = `${today.slice(0, 7)}-01`;

  const refresh = useCallback(async () => {
    try {
      const [weekResult, paidResult, monthResult] = await Promise.all([
        loadBookings({ data: { dateFrom: today, dateTo: weekEnd, status: "all", limit: 300 } }),
        loadBookings({ data: { status: "paid", limit: 500 } }),
        loadBookings({ data: { dateFrom: monthStart, dateTo: `${today.slice(0, 7)}-31`, status: "paid", limit: 500 } }),
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
  }, [loadBookings, loadIntegrations, today, weekEnd, monthStart]);

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
  const tomorrowRows = week.filter((row) => row.preferred_date === tomorrow);
  const nextDays = Array.from({ length: 6 }, (_, index) => lisbonDay(index + 2)).map((date) => ({
    date,
    rows: week.filter((row) => row.preferred_date === date),
  }));

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
    <AdminShell eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title="Today">
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

      {exceptions.length > 0 ? (
        <section className="mt-10">
          <AdminSectionTitle count={exceptions.length}>Needs you</AdminSectionTitle>
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

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <DayBlock title="Today" rows={todayRows} guideName={guideName} />
        <DayBlock title="Tomorrow" rows={tomorrowRows} guideName={guideName} />
      </div>

      <section className="mt-10">
        <AdminSectionTitle>Next days</AdminSectionTitle>
        <ul className="mt-3 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
          {nextDays.map(({ date, rows }) => {
            const unassigned = rows.filter((row) => !row.assigned_guide_id).length;
            return (
              <li key={date}>
                <Link
                  to="/admin/bookings"
                  search={{ focus: "week" }}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-[13.5px]"
                >
                  <span className="w-28 shrink-0 text-[color:var(--charcoal-soft)]">{dayLabel(date)}</span>
                  <span className="flex-1 text-[color:var(--charcoal)]">
                    {rows.length === 0 ? <span className="text-[color:var(--charcoal-soft)]">—</span> : `${rows.length} trip${rows.length === 1 ? "" : "s"}`}
                  </span>
                  {unassigned > 0 ? (
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[#8A6B23]">{unassigned} without guide</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

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
      <Link to="/admin/bookings" search={{ open: item.bookingId }} className={className}>
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

function DayBlock({ title, rows, guideName }: { title: string; rows: Row[]; guideName: (id: string | null) => string | null }) {
  const sorted = [...rows].sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
  return (
    <section>
      <AdminSectionTitle count={rows.length}>{title}</AdminSectionTitle>
      {sorted.length === 0 ? (
        <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">No trips.</p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {sorted.map((row) => (
            <li key={row.id}>
              <Link
                to="/admin/bookings"
                search={{ open: row.id }}
                className="flex min-h-11 items-baseline gap-3 rounded-md py-2 text-[13.5px] hover:bg-[color:var(--sand)]/60"
              >
                <span className="w-12 shrink-0 tabular-nums text-[color:var(--charcoal-soft)]">{row.start_time ?? "—"}</span>
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
