/**
 * Reconciliation report: what the Stripe + email passes did, and which paid
 * reservations still lack operational detail.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getOpsVoucherReconciliationReport,
  listOpsReconciliation,
  runOpsVoucherReconciliation,
} from "@/lib/bookingsOps.functions";

type VoucherRow = {
  bookingId: string;
  customer: string;
  email: string;
  amount: string;
  tourTitle: string | null;
  date: string | null;
  outcome: string;
  rule: string | null;
  fields: string[];
  subject: string | null;
  messageDate: string | null;
  duplicateSuppressed: string | null;
  reason: string | null;
};

type VoucherReport = {
  ran_at?: string;
  dry_run?: boolean;
  considered?: number;
  vouchers_found?: number;
  enriched?: number;
  duplicates_suppressed?: number;
  ambiguous?: number;
  no_voucher?: number;
  already_complete?: number;
  excluded_test?: number;
  rows?: VoucherRow[];
};

const VOUCHER_COUNTS: Array<[keyof VoucherReport, string]> = [
  ["considered", "Paid reservations considered"],
  ["vouchers_found", "Sent confirmations read"],
  ["enriched", "Reservations completed"],
  ["duplicates_suppressed", "Duplicate email rows merged"],
  ["ambiguous", "Sent to Needs Review"],
  ["no_voucher", "No matching confirmation"],
];


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
  const loadVoucher = useServerFn(getOpsVoucherReconciliationReport);
  const runVoucher = useServerFn(runOpsVoucherReconciliation);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [shells, setShells] = useState<Shell[]>([]);
  const [voucher, setVoucher] = useState<VoucherReport | null>(null);
  const [voucherRanAt, setVoucherRanAt] = useState<string | null>(null);
  const [voucherBusy, setVoucherBusy] = useState<false | "dry" | "apply">(false);

  const refreshVoucher = async () => {
    try {
      const result = await loadVoucher({ data: {} });
      const detail = (result.state?.detail ?? null) as VoucherReport | null;
      setVoucher(detail);
      setVoucherRanAt(result.state?.last_run_at ?? null);
    } catch {
      // The panel still works without a stored reconciliation result.
    }
  };

  const runReconciliation = async (dryRun: boolean) => {
    setVoucherBusy(dryRun ? "dry" : "apply");
    try {
      const result = await runVoucher({ data: { dryRun, maxRows: 60, maxMessagesPerGuest: 8 } });
      const report = result.report as VoucherReport;
      setVoucher(report);
      setVoucherRanAt(report.ran_at ?? new Date().toISOString());
      toast.success(
        dryRun
          ? `Dry run: ${report.enriched ?? 0} reservations would be completed, ${report.ambiguous ?? 0} need review.`
          : `${report.enriched ?? 0} reservations completed, ${report.duplicates_suppressed ?? 0} duplicates merged.`,
      );
      if (!dryRun) void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reconciliation pass could not run.");
    } finally {
      setVoucherBusy(false);
    }
  };

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
    void refreshVoucher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-3">
        <p className="text-[13px] font-medium text-[color:var(--charcoal)]">
          Voucher reconciliation (paid reservations vs sent confirmations)
        </p>
        <p className="mt-1 text-[11.5px] text-[color:var(--charcoal-soft)]">
          {voucherRanAt
            ? `Last run ${new Date(voucherRanAt).toLocaleString("en-GB")}${voucher?.dry_run ? " · preview only" : ""}`
            : "Not run yet."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={voucherBusy !== false}
            onClick={() => void runReconciliation(true)}
            className="min-h-[40px] rounded-full border border-[color:var(--charcoal)]/15 bg-white px-3 text-[12px] text-[color:var(--charcoal)] disabled:opacity-60"
          >
            {voucherBusy === "dry" ? "Checking…" : "Preview matches"}
          </button>
          <button
            type="button"
            disabled={voucherBusy !== false}
            onClick={() => void runReconciliation(false)}
            className="min-h-[40px] rounded-full bg-[color:var(--teal)] px-3 text-[12px] text-white disabled:opacity-60"
          >
            {voucherBusy === "apply" ? "Applying…" : "Apply confident matches"}
          </button>
        </div>
        {voucher ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOUCHER_COUNTS.map(([key, label]) => (
                <div key={String(key)} className="rounded-lg border border-[color:var(--charcoal)]/12 p-2.5">
                  <p className="text-[20px] tabular-nums text-[color:var(--charcoal)]">
                    {(voucher[key] as number | undefined) ?? 0}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">{label}</p>
                </div>
              ))}
            </div>
            {(voucher.rows ?? []).length > 0 ? (
              <ul className="mt-3 divide-y divide-[color:var(--charcoal)]/10">
                {(voucher.rows ?? []).map((row) => (
                  <li key={`${row.bookingId}-${row.outcome}`} className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[color:var(--sand)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                        {row.outcome.replace(/_/g, " ")}
                      </span>
                      <button
                        type="button"
                        className="text-[12.5px] text-[color:var(--teal)] underline decoration-dotted"
                        onClick={() => onOpenBooking?.(row.bookingId)}
                      >
                        {row.customer} · {row.email}
                      </button>
                      <span className="text-[11.5px] tabular-nums text-[color:var(--charcoal-soft)]">{row.amount}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[color:var(--charcoal)]">
                      {row.tourTitle ?? "tour to confirm"} · {row.date ?? "date to confirm"}
                    </p>
                    {row.subject ? (
                      <p className="text-[11px] text-[color:var(--charcoal-soft)]">
                        {row.subject}
                        {row.messageDate ? ` · ${new Date(row.messageDate).toLocaleDateString("en-GB")}` : ""}
                        {row.rule ? ` · matched on ${row.rule.replace(/_/g, " ")}` : ""}
                      </p>
                    ) : null}
                    {row.duplicateSuppressed ? (
                      <p className="text-[11px] text-[color:var(--charcoal-soft)]">Duplicate email row merged.</p>
                    ) : null}
                    {row.reason ? (
                      <p className="text-[11px] text-[color:var(--charcoal-soft)]">{row.reason.replace(/_/g, " ")}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>


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
