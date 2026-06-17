import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  clearStudioV3AuditBuffer,
  readStudioV3AuditBuffer,
  type StudioV3BufferedEvent,
  type StudioV3CurationDecision,
  type StudioV3Phase4Timing,
} from "@/lib/studio-v3-telemetry";

export const Route = createFileRoute("/admin/studio-v3-audit")({
  head: () => ({
    meta: [
      { title: "Studio V3 audit — YES internal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudioV3AuditPage,
});

type Bucket = "mobile" | "tablet" | "desktop";

function classifyViewport(w: number | undefined): Bucket {
  if (!w) return "desktop";
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function p(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

function StudioV3AuditPage() {
  const [events, setEvents] = useState<StudioV3BufferedEvent[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setEvents(readStudioV3AuditBuffer());
    const onAny = () => setEvents(readStudioV3AuditBuffer());
    window.addEventListener("studio-v3:curation.decision", onAny);
    window.addEventListener("studio-v3:phase4.timing", onAny);
    return () => {
      window.removeEventListener("studio-v3:curation.decision", onAny);
      window.removeEventListener("studio-v3:phase4.timing", onAny);
    };
  }, [tick]);

  const decisions = useMemo(
    () =>
      events
        .filter((e) => e.kind === "curation.decision")
        .map((e) => ({ ts: e.ts, d: e.payload as StudioV3CurationDecision })),
    [events],
  );

  const timings = useMemo(
    () =>
      events
        .filter((e) => e.kind === "phase4.timing")
        .map((e) => ({ ts: e.ts, t: e.payload as StudioV3Phase4Timing })),
    [events],
  );

  // Phase 4 timing aggregation by device bucket × phase.
  const phase4Stats = useMemo(() => {
    const groups = new Map<string, number[]>();
    const buckets = new Set<Bucket>();
    const phases = new Set<string>();
    for (const { t } of timings) {
      const bucket = classifyViewport(t.viewport?.w);
      buckets.add(bucket);
      phases.add(t.phase);
      const key = `${bucket}|${t.phase}`;
      const arr = groups.get(key) ?? [];
      arr.push(t.elapsedMs);
      groups.set(key, arr);
    }
    return {
      buckets: Array.from(buckets),
      phases: Array.from(phases),
      cell: (b: Bucket, ph: string) => groups.get(`${b}|${ph}`) ?? [],
    };
  }, [timings]);

  // Reduced-motion split.
  const reducedMotion = useMemo(() => {
    let rm = 0;
    let total = 0;
    for (const { t } of timings) {
      total += 1;
      if (t.reducedMotion) rm += 1;
    }
    return { rm, total };
  }, [timings]);

  // Rejection rollup.
  const rejections = useMemo(() => {
    const map = new Map<string, number>();
    for (const { d } of decisions) {
      for (const r of d.rejections) {
        map.set(r.reason, (map.get(r.reason) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [decisions]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 font-sans text-[color:var(--charcoal)]">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Internal · Studio V3
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Curation & Phase 4 audit
          </h1>
          <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
            Live buffer of the last {events.length} events on this device
            (localStorage, max 200). Open Studio V3 in another tab to populate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearStudioV3AuditBuffer();
            setTick((n) => n + 1);
          }}
          className="rounded border border-[color:var(--charcoal)]/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] hover:bg-[color:var(--sand)]"
        >
          Clear buffer
        </button>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Rejections rollup ({decisions.length} decisions)
        </h2>
        {rejections.length === 0 ? (
          <p className="text-sm text-[color:var(--charcoal-soft)]">
            No rejections recorded yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--charcoal)]/10 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                <th className="py-2">Reason</th>
                <th className="py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {rejections.map(([reason, n]) => (
                <tr
                  key={reason}
                  className="border-b border-[color:var(--charcoal)]/5"
                >
                  <td className="py-2 font-mono text-xs">{reason}</td>
                  <td className="py-2 text-right tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Phase 4 timing by device
        </h2>
        <p className="mb-3 text-xs text-[color:var(--charcoal-soft)]">
          Median / p95 ms · reduced-motion: {reducedMotion.rm}/
          {reducedMotion.total}
        </p>
        {timings.length === 0 ? (
          <p className="text-sm text-[color:var(--charcoal-soft)]">
            No phase4 timings recorded yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--charcoal)]/10 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                <th className="py-2">Device</th>
                {phase4Stats.phases.map((ph) => (
                  <th key={ph} className="py-2 text-right">
                    {ph}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phase4Stats.buckets.map((b) => (
                <tr
                  key={b}
                  className="border-b border-[color:var(--charcoal)]/5"
                >
                  <td className="py-2 font-mono text-xs">{b}</td>
                  {phase4Stats.phases.map((ph) => {
                    const arr = phase4Stats.cell(b, ph);
                    if (arr.length === 0) {
                      return (
                        <td
                          key={ph}
                          className="py-2 text-right text-[color:var(--charcoal-soft)]"
                        >
                          —
                        </td>
                      );
                    }
                    return (
                      <td
                        key={ph}
                        className="py-2 text-right tabular-nums"
                      >
                        {p(arr, 0.5)} / {p(arr, 0.95)}
                        <span className="ml-1 text-[10px] text-[color:var(--charcoal-soft)]">
                          ({arr.length})
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Recent decisions
        </h2>
        <div className="space-y-3">
          {decisions
            .slice(-20)
            .reverse()
            .map(({ ts, d }, i) => (
              <details
                key={`${ts}-${i}`}
                className="rounded border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] px-3 py-2 text-sm"
              >
                <summary className="cursor-pointer">
                  <span className="font-mono text-xs text-[color:var(--charcoal-soft)]">
                    {new Date(ts).toLocaleTimeString()}
                  </span>{" "}
                  <span className="font-semibold">{d.tourTitleInternal}</span>
                  <span className="ml-2 text-xs text-[color:var(--charcoal-soft)]">
                    {d.feeling} · {d.companions} · {d.rhythm}
                    {d.dateExact ? ` · ${d.dateExact}` : ""}
                  </span>
                  {d.rejections.length > 0 && (
                    <span className="ml-2 rounded bg-[color:var(--gold-soft)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                      {d.rejections.length} rej
                    </span>
                  )}
                  {d.wineSwapApplied && (
                    <span className="ml-1 rounded bg-[color:var(--teal)]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                      wine swap
                    </span>
                  )}
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                      Picked ({d.picked.length}/{d.target}) · pool{" "}
                      {d.poolSizeAfterClosures}/{d.poolSizeRaw}
                    </div>
                    <ul className="mt-1 list-disc pl-4">
                      {d.picked.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                      Rejections
                    </div>
                    {d.rejections.length === 0 ? (
                      <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                        None.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {d.rejections.map((r, idx) => (
                          <li key={`${r.label}-${idx}`}>
                            <span className="font-mono">{r.reason}</span> ·{" "}
                            {r.label}
                            {r.detail ? ` (${r.detail})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </details>
            ))}
        </div>
      </section>
    </main>
  );
}
