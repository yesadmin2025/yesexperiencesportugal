import { Link } from "@tanstack/react-router";
import type { CanonicalFields } from "@/lib/ops/booking-read-model";

type Row = CanonicalFields & {
  id: string; preferred_date: string | null; start_time?: string | null; tour_title: string | null;
  source_tour_id: string | null; customer_name: string | null; customer_email?: string | null;
  guests?: number | null; pickup_location: string | null; source_channel?: string | null; status?: string | null;
  adults?: number | null; minors?: number; stops?: string[];
  amount_paid?: number | null; amount_total?: number | null; currency?: string | null;
};
export type BookingListGuide = { id: string; name: string };
export const bookingDate = (date: string | null) => date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date to confirm";
const fmtMoney = (amount: number | null | undefined, currency: string | null | undefined) =>
  typeof amount === "number" && Number.isFinite(amount)
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: (currency || "EUR").toUpperCase() }).format(amount)
    : null;
export function BookingListRow({ row, guides, reason }: { row: Row; guides: BookingListGuide[]; reason?: string }) {
  const guide = guides.find((g) => g.id === row.guide_id)?.name ?? (row.legacy_guide_id ? "Guide not scheduled — reassign" : "No guide");
  const confirmation = row.guide_id ? "Scheduled" : "Unassigned";
  const party = row.adults != null
    ? `${row.adults} adult${row.adults === 1 ? "" : "s"}${row.minors ? ` · ${row.minors} child${row.minors === 1 ? "" : "ren"}` : ""}`
    : `${row.guests ?? "—"} guests`;
  const paid = fmtMoney(row.amount_paid, row.currency) ?? fmtMoney(row.amount_total, row.currency);
  return <li className="border-b border-border py-4 last:border-b-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1 text-[13px] leading-relaxed">
        <p className="text-xs text-muted-foreground">{bookingDate(row.preferred_date)} · {row.start_time?.slice(0, 5) || "Time to confirm"}</p>
        <p className="font-[family-name:var(--font-editorial)] text-[18px] leading-snug text-foreground break-words">{row.tour_title ?? row.source_tour_id ?? "Tour to confirm"}</p>
        <p className="break-words">{row.customer_name ?? row.customer_email ?? "Guest to confirm"} · {row.guests ?? "—"} guests</p>
        <p className="break-words text-muted-foreground">Pickup: {row.pickup_location || "To confirm"} · {row.source_channel || "Source not recorded"}</p>
        <p className="break-words">Guide: {guide} · {confirmation}</p>
        <p className="break-words">Payment: {row.payment_label} · Details: {row.completeness_label}</p>
        {reason ? <p className="font-medium text-destructive">{reason}</p> : null}
      </div>
      <Link to="/admin/bookings/$id" params={{ id: row.id }} className="inline-flex min-h-11 shrink-0 items-center self-start text-xs font-medium uppercase text-primary underline underline-offset-4">Open booking →</Link>
    </div>
  </li>;
}
