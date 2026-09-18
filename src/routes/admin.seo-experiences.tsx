/**
 * /admin/seo-experiences — SEO performance per Signature experience.
 *
 * One row per experience: Search Console demand for its own page plus the
 * guide articles that point at it, next to our own booking funnel for the same
 * experience (checkouts opened → guest details → paid → revenue).
 * Read-only. Every number comes from Search Console or the bookings table.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import {
  getExperienceSeoPerformance,
  type ExperienceSeoPerformance,
} from "@/lib/seoPerformance.functions";

export const Route = createFileRoute("/admin/seo-experiences")({
  head: () => ({
    meta: [
      { title: "SEO by experience — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SeoExperiencesPage,
});

const WINDOWS = [7, 28, 90];

function Delta({ now, before, lowerIsBetter }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before && !now) return <span className="text-[color:var(--charcoal-soft)]">—</span>;
  const diff = now - before;
  if (Math.abs(diff) < 0.05) return <span className="text-[color:var(--charcoal-soft)]">=</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className={good ? "text-[color:var(--teal)]" : "text-[color:var(--charcoal)]"}>
      {diff > 0 ? "+" : "−"}
      {Math.abs(diff) >= 10 ? Math.round(Math.abs(diff)) : Math.abs(diff).toFixed(1)}
    </span>
  );
}

function SeoExperiencesPage() {
  const run = useServerFn(getExperienceSeoPerformance);
  const [days, setDays] = useState(28);
  const [data, setData] = useState<ExperienceSeoPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    void run({ data: { days } })
      .then((res) => {
        if (alive) setData(res);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [days, run]);

  const totals = (data?.rows ?? []).reduce(
    (s, r) => ({
      clicks: s.clicks + r.clicks,
      impressions: s.impressions + r.impressions,
      paid: s.paid + r.paid,
      revenue: s.revenue + r.paidRevenueEur,
    }),
    { clicks: 0, impressions: 0, paid: 0, revenue: 0 },
  );

  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
          Search &amp; visibility
        </p>
        <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">SEO by experience</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
          Google demand for each experience page and the guides that feed it, beside the real
          booking funnel for the same experience.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`min-h-11 border px-4 text-sm ${
                days === d
                  ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                  : "border-[color:var(--border)] text-[color:var(--charcoal)]"
              }`}
            >
              Last {d} days
            </button>
          ))}
          <Link
            to="/admin/seo-monitor"
            className="min-h-11 items-center px-3 text-sm text-[color:var(--teal)] underline"
          >
            SEO monitor
          </Link>
        </div>

        {loading && <p className="mt-8 text-sm">Loading…</p>}
        {error && (
          <p className="mt-8 border border-[color:var(--border)] bg-white/60 p-4 text-sm">
            {error}
          </p>
        )}

        {data && !loading && (
          <>
            <p className="mt-6 text-xs text-[color:var(--charcoal-soft)]">
              Search window {data.current.startDate} → {data.current.endDate}, compared with{" "}
              {data.previous.startDate} → {data.previous.endDate}. Bookings cover the last{" "}
              {data.days} days.
            </p>
            {data.searchError && (
              <p className="mt-3 border border-[color:var(--border)] bg-white/60 p-3 text-xs">
                Search Console unavailable: {data.searchError}
              </p>
            )}
            {data.bookingError && (
              <p className="mt-3 border border-[color:var(--border)] bg-white/60 p-3 text-xs">
                Bookings unavailable: {data.bookingError}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Clicks", value: totals.clicks.toLocaleString() },
                { label: "Impressions", value: totals.impressions.toLocaleString() },
                { label: "Paid bookings", value: String(totals.paid) },
                { label: "Paid revenue", value: `€${totals.revenue.toLocaleString()}` },
              ].map((c) => (
                <div key={c.label} className="border border-[color:var(--border)] bg-white/60 p-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                    {c.label}
                  </dt>
                  <dd className="mt-1 text-xl">{c.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 space-y-4">
              {data.rows.map((r) => (
                <article
                  key={r.tourId}
                  className="border border-[color:var(--border)] bg-white/60 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base leading-snug">{r.title}</h2>
                    <a
                      href={r.path}
                      className="text-xs text-[color:var(--teal)] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.path}
                    </a>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {[
                      {
                        label: "Clicks",
                        value: r.clicks.toLocaleString(),
                        delta: <Delta now={r.clicks} before={r.prevClicks} />,
                      },
                      {
                        label: "Impressions",
                        value: r.impressions.toLocaleString(),
                        delta: <Delta now={r.impressions} before={r.prevImpressions} />,
                      },
                      {
                        label: "Avg. position",
                        value: r.position ? r.position.toFixed(1) : "—",
                        delta: (
                          <Delta now={r.position} before={r.prevPosition} lowerIsBetter />
                        ),
                      },
                      { label: "Checkouts", value: String(r.started) },
                      { label: "Guest details", value: String(r.reachedDetails) },
                      { label: "Paid", value: String(r.paid) },
                      { label: "Revenue", value: `€${r.paidRevenueEur.toLocaleString()}` },
                    ].map((cell) => (
                      <div key={cell.label}>
                        <dt className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                          {cell.label}
                        </dt>
                        <dd className="mt-1 text-sm">
                          {cell.value}{" "}
                          {"delta" in cell && cell.delta ? (
                            <span className="text-xs">({cell.delta})</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {r.guidePaths.length > 0 && (
                    <p className="mt-4 text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
                      Articles feeding this experience: {r.guidePaths.join(" · ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </SiteLayout>
  );
}
