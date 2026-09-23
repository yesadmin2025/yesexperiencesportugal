/**
 * Operations hub — every reservation from every channel in one place.
 *
 * List and calendar share one filtered result set. Selecting a reservation
 * opens the detail panel (a side sheet on desktop, full-height on a phone).
 * Read-and-operate only: pricing, checkout and Stripe behaviour are untouched.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listOpsBookings, OPS_CHANNELS } from "@/lib/bookingsOps.functions";
import { OpsBookingDetail } from "./OpsBookingDetail";
import { OpsReviewInbox } from "./OpsReviewInbox";
import { OpsIntegrationsPanel } from "./OpsIntegrationsPanel";
import { ChannelBadge, GuideBadge, PaymentBadge, ReviewBadge, StatusBadge } from "./badges";

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
type View = "list" | "calendar" | "review" | "reconciliation" | "integrations";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const money = (row: Row): string => {
  const cents = row.amount_paid ?? row.amount_total;
  if (!cents) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: (row.currency || "eur").toUpperCase() }).format(cents / 100);
};

const CHANNEL_DOT: Record<string, string> = {
  WEBSITE: "bg-[color:var(--teal)]",
  DIRECT: "bg-[color:var(--gold)]",
  VIATOR: "bg-[#1F6F5C]",
  GETYOURGUIDE: "bg-[#F05A28]",
  BOKUN: "bg-[#3C5A99]",
  OTHER: "bg-[color:var(--charcoal-soft)]",
};

export function OpsBookingsHub() {
  const load = useServerFn(listOpsBookings);
  const [view, setView] = useState<View>("list");
  const [rows, setRows] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(plusDays(180));
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

  const guideName = (id: string | null) => guides.find((entry) => entry.id === id)?.name ?? null;

  const byDate = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const key = row.preferred_date ?? "unscheduled";
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  }, [rows]);

  const tabs: Array<{ id: View; label: string }> = [
    { id: "list", label: "List" },
    { id: "calendar", label: "Calendar" },
    { id: "review", label: reviewCount > 0 ? `Needs review · ${reviewCount}` : "Needs review" },
    { id: "integrations", label: "Sources" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`min-h-[40px] rounded-full border px-3 text-[12px] font-medium uppercase tracking-[0.14em] ${
              view === tab.id
                ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                : "border-[color:var(--charcoal)]/15 bg-white text-[color:var(--charcoal)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "review" ? <OpsReviewInbox onChanged={refresh} /> : null}
      {view === "integrations" ? <OpsIntegrationsPanel onChanged={refresh} /> : null}

      {view === "list" || view === "calendar" ? (
        <>
          <div className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-3">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void refresh();
              }}
            >
              <Input
                value={search}
                placeholder="Search name, email, phone, reference or tour"
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={loading}>
                Search
              </Button>
            </form>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                From
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                To
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                Booking status
                <select
                  className="mt-1 h-9 w-full rounded-md border border-[color:var(--charcoal)]/20 bg-white px-2 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                >
                  <option value="all">All</option>
                  <option value="paid">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                Payment
                <select
                  className="mt-1 h-9 w-full rounded-md border border-[color:var(--charcoal)]/20 bg-white px-2 text-sm"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
                >
                  <option value="all">All</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING_PAYMENT">Awaiting payment</option>
                </select>
              </label>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                Guide
                <select
                  className="mt-1 h-9 w-full rounded-md border border-[color:var(--charcoal)]/20 bg-white px-2 text-sm"
                  value={guide}
                  onChange={(event) => setGuide(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  {guides.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)] lg:col-span-2">
                Tour / product
                <div className="mt-1 flex gap-2">
                  <Input value={tour} placeholder="e.g. arrabida" onChange={(event) => setTour(event.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                    Apply
                  </Button>
                </div>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {OPS_CHANNELS.map((channel) => {
                const active = channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() =>
                      setChannels((prev) => (active ? prev.filter((entry) => entry !== channel) : [...prev, channel]))
                    }
                    className={`min-h-[36px] rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                      active
                        ? "border-[color:var(--teal)] bg-[color:var(--teal)]/10 text-[color:var(--teal)]"
                        : "border-[color:var(--charcoal)]/15 bg-white text-[color:var(--charcoal-soft)]"
                    }`}
                  >
                    {channel === "GETYOURGUIDE" ? "GetYourGuide" : channel.charAt(0) + channel.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[12.5px] text-[color:var(--charcoal-soft)]">
            {loading ? "Loading…" : `${rows.length} reservation${rows.length === 1 ? "" : "s"} in this range`}
          </p>

          {view === "list" ? (
            <div className="space-y-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className="block w-full rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-3 text-left transition-colors hover:border-[color:var(--teal)]/40"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ChannelBadge channel={row.source_channel} source={row.source} />
                    <StatusBadge status={row.status} />
                    <PaymentBadge paymentStatus={row.payment_status} />
                    <GuideBadge guideName={guideName(row.assigned_guide_id)} />
                    {row.review_required ? <ReviewBadge reason={row.review_reason} /> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium text-[color:var(--charcoal)]">
                      {row.preferred_date ?? "No date"}
                      {row.start_time ? ` · ${row.start_time}` : ""}
                    </span>
                    <span className="text-[13px] text-[color:var(--charcoal-soft)]">{money(row)}</span>
                  </div>
                  <p className="text-[13.5px] text-[color:var(--charcoal)]">
                    {row.tour_title ?? row.source_tour_id ?? "Tour to confirm"}
                  </p>
                  <p className="text-[12.5px] text-[color:var(--charcoal-soft)]">
                    {row.customer_name ?? row.customer_email} · {row.guests} guests
                    {row.pickup_location ? ` · ${row.pickup_location}` : ""}
                    {row.external_booking_ref ? ` · ref ${row.external_booking_ref}` : ""}
                  </p>
                </button>
              ))}
              {!loading && rows.length === 0 ? (
                <p className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4 text-sm text-[color:var(--charcoal-soft)]">
                  No reservations match these filters.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {[...byDate.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayRows]) => (
                  <section key={date} className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-3">
                    <h3 className="text-[13px] font-semibold text-[color:var(--charcoal)]">
                      {date === "unscheduled" ? "Date to confirm" : date}
                      <span className="ml-2 text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                        {dayRows.length} booking{dayRows.length === 1 ? "" : "s"}
                      </span>
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {dayRows
                        .slice()
                        .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
                        .map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(row.id)}
                              className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-[13px] ${
                                row.status === "cancelled"
                                  ? "border-[#9B2C2C]/25 text-[color:var(--charcoal-soft)] line-through"
                                  : "border-[color:var(--charcoal)]/10"
                              } ${row.payment_status === "PENDING_PAYMENT" ? "ring-1 ring-[color:var(--gold)]/60" : ""}`}
                            >
                              <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                  CHANNEL_DOT[(row.source_channel ?? "WEBSITE").toUpperCase()] ?? CHANNEL_DOT["OTHER"]
                                }`}
                              />
                              <span className="w-12 shrink-0 tabular-nums text-[color:var(--charcoal-soft)]">
                                {row.start_time ?? "—"}
                              </span>
                              <span className="min-w-0 flex-1 truncate">
                                {row.tour_title ?? row.source_tour_id ?? "Tour to confirm"} · {row.customer_name ?? row.customer_email}
                              </span>
                              {!row.assigned_guide_id && row.status !== "cancelled" ? (
                                <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[#9B2C2C]">no guide</span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--sand)] p-3 text-[11px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
            {Object.entries(CHANNEL_DOT).map(([channel, dot]) => (
              <span key={channel} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                {channel === "GETYOURGUIDE" ? "GetYourGuide" : channel.charAt(0) + channel.slice(1).toLowerCase()}
              </span>
            ))}
            <span>Gold ring · awaiting payment</span>
            <span>Struck through · cancelled</span>
          </div>
        </>
      ) : null}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden sm:max-w-xl"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle className="text-left text-[16px]">Reservation</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
            {selected ? <OpsBookingDetail bookingId={selected} onChanged={refresh} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
