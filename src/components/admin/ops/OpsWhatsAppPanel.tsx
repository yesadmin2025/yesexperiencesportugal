/**
 * WhatsApp Business as an evidence source.
 *
 * Shows whether the number is connected, the health of incoming messages, and
 * lets the operator preview (dry run) or apply a reconciliation against
 * existing reservations. WhatsApp never creates revenue — it only fills in
 * operational detail or asks for a human decision.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getOpsWhatsAppStatus,
  runOpsWhatsAppHistoryImport,
  runOpsWhatsAppReconciliation,
} from "@/lib/bookingsOps.functions";

type Report = {
  dry_run: boolean;
  messages_read: number;
  enriched: number;
  updated: number;
  cancellations_recorded: number;
  children_created: number;
  needs_review: number;
  no_match: number;
  ignored: number;
  rows: Array<{
    action: string;
    phone: string;
    bookingId: string | null;
    rule: string | null;
    fields: string[];
    reason: string | null;
  }>;
};

type Status = Awaited<ReturnType<typeof getOpsWhatsAppStatus>>;

const moment = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function OpsWhatsAppPanel({ onChanged }: { onChanged?: () => void }) {
  const loadStatus = useServerFn(getOpsWhatsAppStatus);
  const reconcile = useServerFn(runOpsWhatsAppReconciliation);
  const importHistory = useServerFn(runOpsWhatsAppHistoryImport);
  const [status, setStatus] = useState<Status | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setStatus((await loadStatus({})) as Status);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the WhatsApp status.");
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const result = await reconcile({ data: { dryRun, limit: 300, onlyUnprocessed: false } });
      setReport(result.report as unknown as Report);
      toast.success(dryRun ? "Preview finished — nothing was saved." : "Matches applied.");
      await refresh();
      if (!dryRun) onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconciliation failed.");
    } finally {
      setBusy(false);
    }
  };

  const bringHistory = async () => {
    setBusy(true);
    try {
      const result = await importHistory({ data: { dryRun: false, requestSync: true, limit: 300 } });
      setReport(result.report as unknown as Report);
      if (!result.configured) {
        toast.error("WhatsApp Business is not connected to this project yet.");
      } else if (result.errors.length > 0) {
        toast.error(`WhatsApp replied: ${result.errors[0]}`);
      } else {
        toast.success("Past chats requested. They arrive over the next few minutes.");
      }
      await refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "History import failed.");
    } finally {
      setBusy(false);
    }
  };

  const counts = status?.counts;

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">
          WhatsApp Business
        </h3>
        {status?.configured ? (
          <p className="mt-1 text-[13px]">
            Connected{status.number?.displayPhoneNumber ? ` · ${status.number.displayPhoneNumber}` : ""}. Incoming
            messages are read automatically and matched to existing reservations.
            {status.number?.isOnBusinessApp ? " This number is also on the WhatsApp Business app, so past chats can be imported." : ""}
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-[#9B2C2C]">
            Not connected yet. Once the WhatsApp Business number is authorised and linked to this project, messages
            start arriving here and past chats can be imported straight away.
          </p>
        )}
        {status?.numberError ? (
          <p className="mt-2 text-[12.5px] text-[#9B2C2C]">WhatsApp replied: {status.numberError}</p>
        ) : null}

        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Last message received</dt>
            <dd className="font-medium">{moment(status?.lastInboundAt ?? null)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Conversations</dt>
            <dd className="font-medium">{counts?.conversations ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Messages stored</dt>
            <dd className="font-medium">{counts?.messages ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Matched to a reservation</dt>
            <dd className="font-medium">{counts?.matched ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Waiting for a decision</dt>
            <dd className="font-medium">{counts?.needsReview ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--charcoal-soft)]">Not read yet</dt>
            <dd className="font-medium">{counts?.unprocessed ?? 0}</dd>
          </div>
        </dl>

        {status?.lastEvent ? (
          <p className="mt-2 text-[12.5px] text-[color:var(--charcoal-soft)]">
            Last event: {String(status.lastEvent.event)} · {moment(status.lastEvent.received_at)}
            {status.lastEvent.processing_error ? ` · problem: ${status.lastEvent.processing_error}` : ""}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(true)}>
            Preview matches
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void run(false)}>
            Apply confident matches
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !status?.configured} onClick={() => void bringHistory()}>
            Import past chats
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)]">
          Payment always stays with the card payment record. Anything unclear goes to Needs Review instead of being
          guessed, and no chat ever creates a new paid reservation.
        </p>
      </section>

      {report ? (
        <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">
            {report.dry_run ? "Preview result" : "Applied result"}
          </h3>
          <p className="mt-1 text-[13px]">
            {report.messages_read} messages read · {report.enriched} enriched · {report.updated} updated ·{" "}
            {report.cancellations_recorded} cancellations · {report.children_created} extra days ·{" "}
            {report.needs_review} need review · {report.no_match} no match · {report.ignored} ignored
          </p>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-[12.5px] text-[color:var(--charcoal-soft)]">
            {report.rows.map((row, index) => (
              <li key={index}>
                <strong className="font-medium text-[color:var(--charcoal)]">{row.action}</strong> · {row.phone}
                {row.rule ? ` · ${row.rule}` : ""}
                {row.fields.length ? ` · filled ${row.fields.join(", ")}` : ""}
                {row.reason ? ` · ${row.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
