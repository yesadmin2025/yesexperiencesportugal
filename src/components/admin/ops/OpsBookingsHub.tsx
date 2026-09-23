/**
 * Bookings workspace — every reservation from every channel in one place.
 *
 * One primary toggle (List | Calendar), four quick ranges, and advanced
 * filters behind a single Filter button. "Needs attention" also shows the
 * review inbox. Selecting a reservation opens the detail drawer.
 * Read-and-operate only: pricing, checkout and Stripe behaviour are untouched.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listOpsBookings, OPS_CHANNELS } from "@/lib/bookingsOps.functions";
import { OpsBookingDetail } from "./OpsBookingDetail";
import { OpsReviewInbox } from "./OpsReviewInbox";

type Row = {
  id: string;
  created_at: string;
  source: string | null;
  source_channel: string | null;
  source_tour_id: string | null;
  tour_title: string | null;
  external_booking_ref: string | null;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
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

type Guide = { id: string; name: string; active?: boolean | null };
type View = "list" | "calendar";
export type QuickRange = "today" | "week" | "future" | "attention";

const lisbonDay = (offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );

const RANGE: Record<QuickRange, { label: string; from: () => string; to: () => string }> = {
  today: { label: "Today", from: () => lisbonDay(0), to: () => lisbonDay(0) },
  week: { label: "This week", from: () => lisbonDay(0), to: () => lisbonDay(6) },
  future: { label: "Future", from: () => lisbonDay(0), to: () => lisbonDay(365) },
  attention: { label: "Needs attention", from: () => lisbonDay(0), to: () => lisbonDay(365) },
};

const money = (row: Row): string => {
  const cents = row.amount_paid ?? row.amount_total;
  if (!cents) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (row.currency || "eur").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const channelLabel = (row: Row) => {
  const key = (row.source_channel ?? (row.source === "EMAIL" ? "DIRECT" : "WEBSITE")).toUpperCase();
  return key === "GETYOURGUIDE" ? "GetYourGuide" : key.charAt(0) + key.slice(1).toLowerCase();
};

const isLive = (row: Row) => row.status !== "cancelled" && row.status !== "refunded" && row.status !== "failed";

/** Why a live reservation needs a human, in plain words. Empty when fine. */
export function attentionReasons(row: Row): string[] {
  if (!isLive(row)) return [];
  const reasons: string[] = [];
  if (row.review_required) reasons.push(row.review_reason ?? "Flagged for a check");
  if (!row.assigned_guide_id) reasons.push("No guide");
  if (!row.tour_title && !row.source_tour_id) reasons.push("Tour missing");
  if (!row.pickup_location) reasons.push("Pickup missing");
  if (row.payment_status === "PENDING_PAYMENT") reasons.push("Awaiting payment");
  return reasons;
}

/** One quiet status word per row instead of four pills. */
function StatusWord({ row }: { row: Row }) {
  if (row.status === "cancelled") return <span className="text-[#9B2C2C]">Cancelled</span>;
  if (row.status === "refunded") return <span className="text-[color:var(--charcoal-soft)]">Refunded</span>;
  const reasons = attentionReasons(row);
  if (reasons.length) return <span className="text-[#8A6B23]">{reasons[0]}</span>;
  return <span className="text-[color:var(--teal)]">Ready</span>;
}

export function OpsBookingsHub({
  initialRange = "week",
  initialOpen = null,
}: {
  initialRange?: QuickRange;
  initialOpen?: string | null;
}) {
  const load = useServerFn(listOpsBookings);
  const [view, setView] = useState<View>("list");
  const [range, setRange] = useState<QuickRange | "custom">(initialRange);
  const [rows, setRows] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(initialOpen);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(RANGE[initialRange].from());
  const [dateTo, setDateTo] = useState(RANGE[initialRange].to());
  const [channels, setChannels] = useState<string[]>([]);
  const [status, setStatus] = useState<"all" | "paid" | "pending" | "cancelled">("all");
  const [paymentStatus, setPaymentStatus] = useState<"all" | "PAID" | "PENDING_PAYMENT">("all");
  const [guide, setGuide] = useState<string>("all");
  const [tour, setTour] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await load({
        data: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          ...(channels.length ? { channels: channels as Array<(typeof OPS_CHANNELS)[number]> } : {}),
          status,
          paymentStatus,
          guide,
          ...(tour.trim() ? { tour: tour.trim() } : {}),
          limit: 300,
        },
      });
      setRows((result.bookings ?? []) as unknown as Row[]);
      setGuides((result.guides ?? []) as Guide[]);
      setReviewCount(result.reviewCount ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, channels.join(","), status, paymentStatus, guide]);

  const pickRange = (next: QuickRange) => {
    setRange(next);
    setDateFrom(RANGE[next].from());
    setDateTo(RANGE[next].to());
  };

  const guideName = (id: string | null) => guides.find((entry) => entry.id === id)?.name ?? null;

  const visible = useMemo(
    () => (range === "attention" ? rows.filter((row) => attentionReasons(row).length > 0) : rows),
    [rows, range],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const key = row.preferred_date ?? "unscheduled";
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  }, [visible]);

  const advancedActive =
    range === "custom" || channels.length > 0 || status !== "all" || paymentStatus !== "all" || guide !== "all" || !!tour.trim();

  const select = "mt-1 h-10 w-full rounded-md border border-[color:var(--charcoal)]/15 bg-white px-2 text-sm";
  const label = "text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]";

  return (
    <div>
      {/* Row 1: primary toggle + search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="View" className="inline-flex rounded-full border border-[color:var(--charcoal)]/12 p-0.5">
          {(["list", "calendar"] as const).map((id) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`min-h-10 rounded-full px-4 text-[11.5px] uppercase tracking-[0.16em] transition-colors duration-150 ${
                view === id ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]" : "text-[color:var(--charcoal-soft)]"
              }`}
            >
              {id === "list" ? "List" : "Calendar"}
            </button>
          ))}
        </div>
        <form
          className="flex min-w-[12rem] flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void refresh();
          }}
        >
          <Input
            value={search}
            aria-label="Search bookings"
            placeholder="Search guest, email, phone, reference"
            className="h-10 bg-white"
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={14} aria-hidden />
          Filter{advancedActive ? " ·" : ""}
        </Button>
      </div>

      {/* Row 2: quick ranges */}
      <div className="mt-4 flex gap-5 overflow-x-auto border-b border-[color:var(--charcoal)]/[0.08]">
        {(Object.keys(RANGE) as QuickRange[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pickRange(id)}
            aria-pressed={range === id}
            className={`-mb-px min-h-11 shrink-0 border-b-2 text-[13px] transition-colors duration-150 ${
              range === id
                ? "border-[color:var(--teal)] text-[color:var(--charcoal)]"
                : "border-transparent text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            }`}
          >
            {RANGE[id].label}
            {id === "attention" && reviewCount > 0 ? (
              <span className="ml-1.5 text-[#8A6B23]">· {reviewCount} to decide</span>
            ) : null}
          </button>
        ))}
      </div>

      {filtersOpen ? (
        <div className="mt-4 rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>
              From
              <Input type="date" className="mt-1" value={dateFrom} onChange={(event) => { setRange("custom"); setDateFrom(event.target.value); }} />
            </label>
            <label className={label}>
              To
              <Input type="date" className="mt-1" value={dateTo} onChange={(event) => { setRange("custom"); setDateTo(event.target.value); }} />
            </label>
            <label className={label}>
              Booking status
              <select className={select} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="all">All</option>
                <option value="paid">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className={label}>
              Payment
              <select className={select} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}>
                <option value="all">All</option>
                <option value="PAID">Paid</option>
                <option value="PENDING_PAYMENT">Awaiting payment</option>
              </select>
            </label>
            <label className={label}>
              Guide
              <select className={select} value={guide} onChange={(event) => setGuide(event.target.value)}>
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                {guides.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Tour
              <div className="mt-1 flex gap-2">
                <Input value={tour} placeholder="e.g. arrabida" onChange={(event) => setTour(event.target.value)} />
                <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                  Apply
                </Button>
              </div>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {OPS_CHANNELS.map((channel) => {
              const on = channels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChannels((prev) => (on ? prev.filter((entry) => entry !== channel) : [...prev, channel]))}
                  className={`min-h-10 rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                    on
                      ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                      : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal-soft)]"
                  }`}
                >
                  {channel === "GETYOURGUIDE" ? "GetYourGuide" : channel.charAt(0) + channel.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
          {advancedActive ? (
            <button
              type="button"
              className="mt-4 text-[12.5px] text-[color:var(--teal)] underline"
              onClick={() => {
                setChannels([]);
                setStatus("all");
                setPaymentStatus("all");
                setGuide("all");
                setTour("");
                pickRange("week");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {range === "attention" && reviewCount > 0 ? (
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">Messages to decide</h2>
          <div className="mt-3">
            <OpsReviewInbox onChanged={refresh} />
          </div>
        </section>
      ) : null}

      <p className="mt-5 text-[12px] text-[color:var(--charcoal-soft)]">
        {loading ? "Loading…" : `${visible.length} reservation${visible.length === 1 ? "" : "s"}`}
      </p>

      {view === "list" ? (
        <ul className="mt-2 divide-y divide-[color:var(--charcoal)]/[0.07] border-y border-[color:var(--charcoal)]/[0.07]">
          {visible.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(row.id)}
                className={`flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-[color:var(--sand)]/50 ${
                  row.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                <span className="w-20 shrink-0 text-[12.5px] tabular-nums text-[color:var(--charcoal-soft)]">
                  {row.preferred_date
                    ? new Date(`${row.preferred_date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : "No date"}
                  {row.start_time ? <span className="block">{row.start_time}</span> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[color:var(--charcoal)]">
                    {row.tour_title ?? row.source_tour_id ?? "Tour to confirm"}
                  </span>
                  <span className="block truncate text-[12.5px] text-[color:var(--charcoal-soft)]">
                    {row.customer_name ?? row.customer_email} · {row.guests} · {channelLabel(row)}
                    {guideName(row.assigned_guide_id) ? ` · ${guideName(row.assigned_guide_id)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[12px]">
                  <StatusWord row={row} />
                  <span className="block text-[color:var(--charcoal-soft)]">{money(row)}</span>
                </span>
              </button>
            </li>
          ))}
          {!loading && visible.length === 0 ? (
            <li className="py-6 text-[13.5px] text-[color:var(--charcoal-soft)]">
              {range === "attention" ? "Nothing needs attention." : "No reservations in this range."}
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="mt-2 space-y-6">
          {[...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayRows]) => (
              <section key={date}>
                <h3 className="flex items-baseline justify-between border-b border-[color:var(--charcoal)]/[0.08] pb-1.5 text-[13px] text-[color:var(--charcoal)]">
                  {date === "unscheduled"
                    ? "Date to confirm"
                    : new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                    {dayRows.length}
                  </span>
                </h3>
                <ul className="mt-1">
                  {dayRows
                    .slice()
                    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
                    .map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(row.id)}
                          className={`flex min-h-11 w-full items-center gap-3 py-1.5 text-left text-[13px] hover:bg-[color:var(--sand)]/50 ${
                            row.status === "cancelled" ? "text-[color:var(--charcoal-soft)] line-through" : ""
                          }`}
                        >
                          <span className="w-12 shrink-0 tabular-nums text-[color:var(--charcoal-soft)]">{row.start_time ?? "—"}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {row.tour_title ?? row.source_tour_id ?? "Tour to confirm"} · {row.customer_name ?? row.customer_email}
                          </span>
                          <span className="shrink-0 text-[11.5px]">
                            <StatusWord row={row} />
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          {!loading && visible.length === 0 ? (
            <p className="text-[13.5px] text-[color:var(--charcoal-soft)]">No reservations in this range.</p>
          ) : null}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[color:var(--ivory)] sm:max-w-xl">
          <SheetHeader className="shrink-0">
            <SheetTitle className="text-left font-[family-name:var(--font-editorial)] text-[20px] font-normal">Reservation</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
            {selected ? <OpsBookingDetail bookingId={selected} onChanged={refresh} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
