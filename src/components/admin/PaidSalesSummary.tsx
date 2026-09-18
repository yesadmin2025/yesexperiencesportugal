/**
 * Paid-sales reading for /admin/bookings.
 *
 * Read-only: it summarises the rows the list already loaded. Nothing here
 * touches pricing, Stripe or booking data — it only adds up what was paid.
 */
import { formatGuestComposition } from "@/components/studio-v3/formatGuests";

export interface PaidSalesRow {
  id: string;
  created_at: string;
  source_tour_id: string | null;
  booking_type: string;
  customer_name: string | null;
  customer_email: string;
  guests: number;
  preferred_date: string | null;
  amount_total: number;
  currency: string;
  status: string;
  booking_details: Record<string, unknown> | null;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function partyOf(b: PaidSalesRow): string {
  const d = (b.booking_details ?? {}) as Record<string, unknown>;
  const comp = (d["composition"] ?? {}) as Record<string, unknown>;
  const adults = typeof comp["adults"] === "number" ? (comp["adults"] as number) : null;
  const minorAges = Array.isArray(comp["minorAges"]) ? (comp["minorAges"] as number[]) : null;
  return formatGuestComposition(adults, minorAges, b.guests) ?? `${b.guests} guests`;
}

/** Trip date when we have one; otherwise the day it was paid. */
function sortKey(b: PaidSalesRow): string {
  return b.preferred_date ?? b.created_at.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function PaidSalesSummary({ rows, currency }: { rows: PaidSalesRow[]; currency: string }) {
  const paid = rows
    .filter((b) => b.status === "paid")
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  if (paid.length === 0) return null;

  const total = paid.reduce((sum, b) => sum + (b.amount_total || 0), 0);
  const average = Math.round(total / paid.length);
  const thisMonth = monthKey(new Date().toISOString());
  const monthRows = paid.filter((b) => monthKey(sortKey(b)) === thisMonth);
  const monthTotal = monthRows.reduce((sum, b) => sum + (b.amount_total || 0), 0);

  return (
    <section className="mt-8" data-admin-sales>
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
        Sales · paid bookings
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Paid revenue", value: money(total, currency) },
          { label: "Paid bookings", value: String(paid.length) },
          { label: "Average booking", value: money(average, currency) },
          {
            label: "This month",
            value: `${money(monthTotal, currency)} · ${monthRows.length}`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-[color:var(--sand)] bg-white px-4 py-3"
          >
            <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              {card.label}
            </dt>
            <dd className="mt-1 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
              {card.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Phone: stacked cards. Tablet and up: a four-column reading table. */}
      <ul className="mt-4 divide-y divide-[color:var(--sand)] border-y border-[color:var(--sand)] sm:hidden">
        {paid.map((b) => (
          <li key={b.id} className="py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              {b.preferred_date ?? `paid ${b.created_at.slice(0, 10)}`}
            </p>
            <p className="mt-1 text-sm text-[color:var(--charcoal)]">
              {b.source_tour_id ?? b.booking_type}
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[color:var(--charcoal-soft)]">{partyOf(b)}</span>
              <span className="font-semibold text-[color:var(--charcoal)]">
                {money(b.amount_total, b.currency)}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Paid bookings with date, group and total</caption>
          <thead>
            <tr className="border-b border-[color:var(--sand)] text-left text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              <th scope="col" className="py-2 pr-4 font-normal">
                Date
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                Experience
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                Group
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                Total paid
              </th>
            </tr>
          </thead>
          <tbody>
            {paid.map((b) => (
              <tr key={b.id} className="border-b border-[color:var(--sand)]">
                <td className="py-2.5 pr-4 whitespace-nowrap text-[color:var(--charcoal-soft)]">
                  {b.preferred_date ?? `paid ${b.created_at.slice(0, 10)}`}
                </td>
                <td className="py-2.5 pr-4 text-[color:var(--charcoal)]">
                  {b.source_tour_id ?? b.booking_type}
                </td>
                <td className="py-2.5 pr-4 text-[color:var(--charcoal-soft)]">{partyOf(b)}</td>
                <td className="py-2.5 text-right font-semibold text-[color:var(--charcoal)]">
                  {money(b.amount_total, b.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-2.5 pr-4 text-[color:var(--charcoal-soft)]">
                {paid.length} paid booking{paid.length === 1 ? "" : "s"}
              </td>
              <td className="py-2.5 text-right font-semibold text-[color:var(--charcoal)]">
                {money(total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
