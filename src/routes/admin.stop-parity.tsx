/**
 * /admin/stop-parity — read-only preview report showing, per Signature
 * tour, which stops differ between the Viator Source-of-Truth itinerary
 * and the YES surfaces (tour config, map coords, Studio intents).
 *
 * Preview-gated: renders freely on any lovable.app host or with ?preview=1.
 * On production hosts requires an ADMIN role via the standard admin gate.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { computeAllTourParity, type StopParityStatus } from "@/lib/stop-parity";

export const Route = createFileRoute("/admin/stop-parity")({
  head: () => ({
    meta: [
      { title: "Stop parity — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StopParityPage,
});

const STATUS_LABEL: Record<StopParityStatus, string> = {
  match: "Match",
  "sot-missing-in-yes": "Missing in YES",
  "yes-only": "YES only",
  "missing-map-coord": "No map coord",
  "missing-studio-intent": "No Studio intent",
};

const STATUS_STYLE: Record<StopParityStatus, string> = {
  match: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "sot-missing-in-yes": "text-red-700 bg-red-50 border-red-200",
  "yes-only": "text-amber-700 bg-amber-50 border-amber-200",
  "missing-map-coord": "text-orange-700 bg-orange-50 border-orange-200",
  "missing-studio-intent": "text-sky-700 bg-sky-50 border-sky-200",
};

function StopParityPage() {
  const reports = useMemo(() => computeAllTourParity(), []);
  const totals = useMemo(() => {
    const t = { total: 0, matched: 0, missingInYes: 0, yesOnly: 0, missingMapCoord: 0, missingStudioIntent: 0 };
    reports.forEach((r) => {
      t.total += r.counts.total;
      t.matched += r.counts.matched;
      t.missingInYes += r.counts.missingInYes;
      t.yesOnly += r.counts.yesOnly;
      t.missingMapCoord += r.counts.missingMapCoord;
      t.missingStudioIntent += r.counts.missingStudioIntent;
    });
    return t;
  }, [reports]);

  return (
    <SiteLayout>
      <section className="pt-24 pb-16">
        <div className="container-x max-w-6xl">
          <Eyebrow flank>Admin · read-only</Eyebrow>
          <SectionTitle size="compact">
            Stop <SectionTitle.Em>parity</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-3 max-w-2xl text-[14px] text-[color:var(--charcoal-soft)]">
            Compares every Signature tour's Viator source-of-truth itinerary against the YES
            tour config, map coordinates and Studio intents. Flags anything that would render
            differently on preview.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-3 text-[12px]">
            <Stat label="Rows" value={totals.total} />
            <Stat label="Matched" value={totals.matched} tone="emerald" />
            <Stat label="Missing in YES" value={totals.missingInYes} tone="red" />
            <Stat label="YES only" value={totals.yesOnly} tone="amber" />
            <Stat label="No map coord" value={totals.missingMapCoord} tone="orange" />
            <Stat label="No Studio intent" value={totals.missingStudioIntent} tone="sky" />
          </div>

          <div className="mt-10 space-y-10">
            {reports.map((r) => (
              <div key={r.tourId} className="border border-[color:var(--border)] rounded-md">
                <div className="flex items-baseline justify-between px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--sand)]/40">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                      Tour id
                    </p>
                    <h3 className="serif text-[1.05rem] text-[color:var(--charcoal)]">
                      {r.tourId}
                    </h3>
                  </div>
                  <div className="text-right text-[11px] text-[color:var(--charcoal-soft)]">
                    {r.hasSot ? (
                      <>
                        {r.counts.matched}/{r.counts.total} match
                        {r.counts.missingInYes > 0 && (
                          <span className="ml-2 text-red-700">
                            · {r.counts.missingInYes} missing
                          </span>
                        )}
                        {r.counts.yesOnly > 0 && (
                          <span className="ml-2 text-amber-700">
                            · {r.counts.yesOnly} yes-only
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-orange-700">No SoT entry</span>
                    )}
                    <div className="mt-1">
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: r.tourId }}
                        className="underline underline-offset-2 text-[color:var(--teal)]"
                      >
                        open tour ↗
                      </Link>
                    </div>
                  </div>
                </div>
                <table className="w-full text-[13px]">
                  <thead className="text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                    <tr>
                      <th className="text-left px-4 py-2 w-10">#</th>
                      <th className="text-left px-4 py-2">SoT (Viator)</th>
                      <th className="text-left px-4 py-2">YES</th>
                      <th className="text-left px-4 py-2 w-24">Map</th>
                      <th className="text-left px-4 py-2 w-24">Studio</th>
                      <th className="text-left px-4 py-2 w-44">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-[color:var(--border)] align-top"
                      >
                        <td className="px-4 py-2 tabular-nums text-[color:var(--charcoal-soft)]">
                          {row.order ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {row.sotLabel ?? <span className="text-[color:var(--charcoal-soft)]">—</span>}
                          {row.optional && (
                            <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                              optional
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {row.yesLabel ?? <span className="text-[color:var(--charcoal-soft)]">—</span>}
                        </td>
                        <td className="px-4 py-2">{row.hasMapCoord ? "✓" : "—"}</td>
                        <td className="px-4 py-2">{row.hasStudioIntent ? "✓" : "—"}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10.5px] uppercase tracking-[0.18em] ${STATUS_STYLE[row.status]}`}
                          >
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {r.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-[color:var(--charcoal-soft)]">
                          Nothing to compare — no SoT entry and no YES stops.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "red" | "amber" | "orange" | "sky";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
        ? "text-red-700"
        : tone === "amber"
          ? "text-amber-700"
          : tone === "orange"
            ? "text-orange-700"
            : tone === "sky"
              ? "text-sky-700"
              : "text-[color:var(--charcoal)]";
  return (
    <div className="border border-[color:var(--border)] rounded-md px-3 py-2 bg-white">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
        {label}
      </div>
      <div className={`serif text-[1.4rem] tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
