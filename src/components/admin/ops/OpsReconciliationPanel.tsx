/**
 * Reconciliation report: what the Stripe + email passes did, and which paid
 * reservations still lack operational detail.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listOpsReconciliation } from "@/lib/bookingsOps.functions";

type Row = {
  id: string;
  created_at: string;
  subject: string | null;
  source: string | null;
  source_channel: string | null;
  action: string | null;
  reason: string | null;
  matched_booking_id: string | null;
  group: string;
};

type Shell = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  tour_title: string | null;
  preferred_date: string | null;
  pickup_location: string | null;
};

const GROUP_LABEL: Record<string, string> = {
  enriched: "Enriched existing reservation",
  created: "New reservation created",
  duplicate: "Skipped — duplicate",
  skipped: "Skipped — cancelled, past or unconfirmed",
  conflict: "Needs review or conflict",
};

const GROUP_TONE: Record<string, string> = {
  enriched: "bg-[color:var(--teal)]/10 text-[color:var(--teal)]",
  created: "bg-emerald-50 text-emerald-700",
  duplicate: "bg-[color:var(--charcoal)]/8 text-[color:var(--charcoal-soft)]",
  skipped: "bg-[color:var(--charcoal)]/8 text-[color:var(--charcoal-soft)]",
  conflict: "bg-amber-50 text-amber-700",
};

export function OpsReconciliationPanel({ onOpenBooking }: { onOpenBooking?: (id: string) => void }) {
  const load = useServerFn(listOpsReconciliation);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [shells, setShells] = useState<Shell[]>([]);

  const refresh = async (nextDays = days) => {
    setLoading(true);
    try {
      const result = await load({ data: { days: nextDays, limit: 200 } });
      setRows((result.rows ?? []) as unknown as Row[]);
      setSummary(result.summary ?? {});
      setShells((result.incompleteStripe ?? []) as unknown as Shell[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the reconciliation report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 120].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setDays(value);
              void refresh(value);
            }}
            className={`min-h-[40px] rounded-full border px-3 text-[12px] ${
              days === value
                ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                : "border-[color:var(--charcoal)]/15 bg-white text-[color:var(--charcoal)]"
            }`}
          >
            Last {value} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.keys(GROUP_LABEL).map((group) => (
          <div key={group} className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-3">
            <p className="text-[22px] tabular-nums text-[color:var(--charcoal)]">{summary[group] ?? 0}</p>
            <p className="mt-1 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">{GROUP_LABEL[group]}</p>
          </div>
        ))}
      </div>

      {shells.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-[13px] font-medium text-[color:var(--charcoal)]">
            Paid reservations still missing operational detail ({shells.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {shells.map((shell) => (
              <li key={shell.id} className="text-[12px] text-[color:var(--charcoal-soft)]">
                <button
                  type="button"
                  className="text-left underline decoration-dotted"
                  onClick={() => onOpenBooking?.(shell.id)}
                >
                  {shell.customer_name ?? shell.customer_email ?? "Unnamed guest"} ·{" "}
                  {shell.tour_title ?? "tour to confirm"} · {shell.preferred_date ?? "date to confirm"}
                  {shell.pickup_location ? "" : " · pick-up to confirm"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white">
        {loading ? (
          <p className="p-3 text-[13px] text-[color:var(--charcoal-soft)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-[13px] text-[color:var(--charcoal-soft)]">
            Nothing reconciled in this period yet.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--charcoal)]/10">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] ${GROUP_TONE[row.group] ?? ""}`}>
                    {row.group}
                  </span>
                  <span className="text-[11px] text-[color:var(--charcoal-soft)]">
                    {new Date(row.created_at).toLocaleString("en-GB")}
                  </span>
                  {row.source_channel ? (
                    <span className="text-[11px] text-[color:var(--charcoal-soft)]">{row.source_channel}</span>
                  ) : null}
                </div>
                <p className="text-[13px] text-[color:var(--charcoal)]">{row.subject ?? "(no subject)"}</p>
                {row.reason ? (
                  <p className="text-[11.5px] text-[color:var(--charcoal-soft)]">{row.reason.replace(/_/g, " ")}</p>
                ) : null}
                {row.matched_booking_id ? (
                  <button
                    type="button"
                    className="self-start text-[11.5px] text-[color:var(--teal)] underline decoration-dotted"
                    onClick={() => onOpenBooking?.(row.matched_booking_id!)}
                  >
                    Open reservation
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
