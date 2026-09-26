import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getAdminGuestFileHistory, getReceivedRevenueByExperience } from "@/lib/operationsOverview.functions";
import { findTour } from "@/data/signatureTours";

type Revenue = Awaited<ReturnType<typeof getReceivedRevenueByExperience>>[number];
type FileHistory = Awaited<ReturnType<typeof getAdminGuestFileHistory>>;

export function OperationsOverview() {
  const loadRevenue = useServerFn(getReceivedRevenueByExperience);
  const loadFiles = useServerFn(getAdminGuestFileHistory);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [history, setHistory] = useState<FileHistory | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadRevenue(), loadFiles({ data: { page } })]).then(([amounts, files]) => {
      if (!active) return;
      setRevenue(amounts);
      setHistory(files);
      setError(null);
    }).catch(() => {
      if (active) setError("Could not load the overview. Try again shortly.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadRevenue, loadFiles, page]);

  return (
    <div className="mt-10 mb-10 space-y-9 border-y border-[color:var(--border)] py-10">
      <section aria-labelledby="received-revenue-heading">
        <h2 id="received-revenue-heading" className="font-[family-name:var(--font-editorial)] text-[23px] text-[color:var(--charcoal)]">Received by experience</h2>
        <p className="mt-1 text-[13px] text-[color:var(--charcoal-soft)]">Stripe-confirmed website payments only, excluding OTA and external payments. Not a bank or payout balance.</p>
        {loading && !history ? <p className="mt-4 text-sm">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-[color:var(--charcoal)]" role="alert">{error}</p> : null}
        {!loading && !error && !revenue.length ? <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">No received payments recorded yet.</p> : null}
        <ul className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {revenue.map((item) => (
            <li key={item.key} className="flex min-h-14 items-center justify-between gap-3 py-3 text-[13px]">
              <span className="min-w-0 text-[color:var(--charcoal)]">{findTour(item.title)?.title ?? item.title}<span className="block text-[12px] text-[color:var(--charcoal-soft)]">{item.count} paid reservation{item.count === 1 ? "" : "s"}</span></span>
              <strong className="shrink-0 tabular-nums font-medium text-[color:var(--teal)]">{new Intl.NumberFormat("en-GB", { style: "currency", currency: item.currency }).format(item.cents / 100)}</strong>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="file-history-heading">
        <h2 id="file-history-heading" className="font-[family-name:var(--font-editorial)] text-[23px] text-[color:var(--charcoal)]">Guest files</h2>
        <p className="mt-1 text-[13px] text-[color:var(--charcoal-soft)]">Studio references, grouped by private session. Files are not attributed to a reservation without a verified link.</p>
        {!loading && !error && history?.total === 0 ? <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">No guest files recorded.</p> : null}
        <ul className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {history?.files.map((file) => (
            <li key={file.id} className="flex min-h-14 items-center justify-between gap-3 py-3 text-[13px]">
              <span className="min-w-0 break-words text-[color:var(--charcoal)]">{file.name}<span className="block text-[12px] text-[color:var(--charcoal-soft)]">{new Date(file.createdAt).toLocaleDateString("en-GB")} · Session {file.sessionId.slice(0, 8)} · {Math.round(file.bytes / 1024)} KB</span></span>
              {file.url ? <a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[color:var(--teal)] underline underline-offset-4">View</a> : <span className="shrink-0 text-[color:var(--charcoal-soft)]">Unavailable</span>}
            </li>
          ))}
        </ul>
        {history && history.total > 25 ? <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-[color:var(--charcoal-soft)]">
          <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>{page * 25 + 1}–{Math.min((page + 1) * 25, history.total)} of {history.total}</span>
          <Button variant="outline" size="sm" disabled={loading || (page + 1) * 25 >= history.total} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div> : null}
      </section>
    </div>
  );
}