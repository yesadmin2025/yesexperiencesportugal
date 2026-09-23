/**
 * Ingestion controls — Gmail scan (dry run first) and Bókun readiness.
 *
 * Credentials live only in the server environment; this panel just reports
 * whether each connection is configured and lets the operator run a scan.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getOpsIntegrationStatus, runOpsEmailIngestion } from "@/lib/bookingsOps.functions";

type Outcome = { action: string; subject: string; reason: string | null; bookingId: string | null };

const CADENCE_MINUTES = 15;

function formatMoment(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readGmailHealth(state: Array<Record<string, unknown>>) {
  const row = state.find((entry) => entry["id"] === "gmail_bookings");
  if (!row) return null;
  const detail = (row["detail"] ?? {}) as Record<string, unknown>;
  const lastRunAt = typeof row["last_run_at"] === "string" ? row["last_run_at"] : null;
  const lastSuccessAt = typeof detail["last_success_at"] === "string" ? detail["last_success_at"] : null;
  const nextRunAt = lastRunAt
    ? new Date(new Date(lastRunAt).getTime() + CADENCE_MINUTES * 60_000).toISOString()
    : null;
  return {
    lastRunAt,
    lastSuccessAt,
    nextRunAt,
    lastStatus: typeof row["last_status"] === "string" ? row["last_status"] : null,
    lastError: typeof row["last_error"] === "string" ? row["last_error"] : null,
    scanned: typeof detail["scanned"] === "number" ? detail["scanned"] : null,
    trigger: typeof detail["last_trigger"] === "string" ? detail["last_trigger"] : "manual",
    summary: (detail["summary"] ?? {}) as Record<string, number>,
  };
}

export function OpsIntegrationsPanel({ onChanged }: { onChanged?: () => void }) {
  const loadStatus = useServerFn(getOpsIntegrationStatus);
  const run = useServerFn(runOpsEmailIngestion);
  const [status, setStatus] = useState<{
    gmail: { configured: boolean };
    bokun: { configured: boolean };
    state: Array<Record<string, unknown>>;
    recent: Array<Record<string, unknown>>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [dryRun, setDryRun] = useState(true);

  const refresh = async () => {
    try {
      setStatus(await loadStatus({}));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read integration status.");
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = async (days: number, asDryRun: boolean) => {
    setBusy(true);
    setDryRun(asDryRun);
    try {
      const result = await run({ data: { days, dryRun: asDryRun, futureOnly: true, maxMessages: 60 } });
      if (!result.configured) {
        toast.error("Gmail is not connected yet.");
        return;
      }
      setOutcomes(result.outcomes as Outcome[]);
      setSummary(result.summary);
      toast.success(asDryRun ? "Dry run finished — nothing was saved." : "Scan finished.");
      await refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">Email (Gmail)</h3>
        {status?.gmail.configured ? (
          <p className="mt-1 text-[13px]">Connected. Bókun notifications in the inbox and YES vouchers in sent mail are read server-side.</p>
        ) : (
          <p className="mt-1 text-[13px] text-[#9B2C2C]">
            Not connected yet. Connect the Google Mail account that receives Bókun notifications and sends vouchers, then run a dry run.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy || !status?.gmail.configured} onClick={() => void scan(30, true)}>
            Dry run · last 30 days
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !status?.gmail.configured} onClick={() => void scan(120, true)}>
            Dry run · last 120 days
          </Button>
          <Button size="sm" disabled={busy || !status?.gmail.configured} onClick={() => void scan(120, false)}>
            Import · last 120 days
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)]">
          Only reservations dated today or later are recorded. Anything unclear goes to Needs Review.
        </p>
      </section>

      {gmailHealth ? (
        <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">
            Automatic scan health
          </h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Last run</dt>
              <dd className="font-medium">{formatMoment(gmailHealth.lastRunAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Result</dt>
              <dd className={gmailHealth.lastStatus === "error" ? "font-medium text-[#9B2C2C]" : "font-medium"}>
                {gmailHealth.lastStatus === "ok" ? "Successful" : gmailHealth.lastStatus === "error" ? "Failed" : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Last successful scan</dt>
              <dd className="font-medium">{formatMoment(gmailHealth.lastSuccessAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Next expected run</dt>
              <dd className="font-medium">{formatMoment(gmailHealth.nextRunAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Emails read</dt>
              <dd className="font-medium">{gmailHealth.scanned ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--charcoal-soft)]">Started by</dt>
              <dd className="font-medium">{gmailHealth.trigger === "cron" ? "Automatic schedule" : "Manual run"}</dd>
            </div>
          </dl>
          {Object.keys(gmailHealth.summary).length > 0 ? (
            <p className="mt-2 text-[12.5px] text-[color:var(--charcoal-soft)]">
              {Object.entries(gmailHealth.summary)
                .map(([action, count]) => `${count} ${action}`)
                .join(" · ")}
            </p>
          ) : null}
          {gmailHealth.lastError ? (
            <p className="mt-2 text-[12.5px] text-[#9B2C2C]">Last problem: {gmailHealth.lastError}</p>
          ) : null}
          <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)]">
            The scan runs by itself every 15 minutes and also updates here after a manual run.
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">Bókun direct sync</h3>
        <p className="mt-1 text-[13px]">
          {status?.bokun.configured
            ? "Credentials present. Reservation notifications sent to the Bókun endpoint are recorded through the same duplicate protection."
            : "Waiting on Bókun access details. Until then, email stays the safety net and nothing is lost."}
        </p>
      </section>

      {Object.keys(summary).length > 0 ? (
        <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">
            {dryRun ? "Dry run result" : "Import result"}
          </h3>
          <p className="mt-1 text-[13px]">
            {Object.entries(summary).map(([action, count]) => `${count} ${action}`).join(" · ")}
          </p>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-[12.5px] text-[color:var(--charcoal-soft)]">
            {outcomes.map((outcome, index) => (
              <li key={index}>
                <strong className="font-medium text-[color:var(--charcoal)]">{outcome.action}</strong> · {outcome.subject}
                {outcome.reason ? ` · ${outcome.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status && status.recent.length > 0 ? (
        <section className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">Recent activity</h3>
          <ul className="mt-2 space-y-1 text-[12.5px] text-[color:var(--charcoal-soft)]">
            {status.recent.map((entry) => (
              <li key={String(entry["id"])}>
                {String(entry["created_at"]).slice(0, 16).replace("T", " ")} · {String(entry["action"])} ·{" "}
                {String(entry["subject"] ?? "")}
                {entry["reason"] ? ` · ${String(entry["reason"])}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
