/**
 * /admin/guide-attribution — which Journal guide sends readers onward,
 * and which of those readers actually book. Read-only.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getGuideAttribution,
  type GuideAttributionRow,
} from "@/lib/guideAttributionAdmin.functions";

export const Route = createFileRoute("/admin/guide-attribution")({
  component: GuideAttributionPage,
  head: () => ({
    meta: [
      { title: "Guide attribution · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
});

const RANGES = [7, 30, 90] as const;

function euros(cents: number): string {
  return `€${(cents / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function GuideAttributionPage() {
  const fetchData = useServerFn(getGuideAttribution);
  const [days, setDays] = useState<number>(30);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    rows: GuideAttributionRow[];
    totalClicks: number;
    attributedBookings: number;
    totalPaidBookings: number;
  }>({
    loading: true,
    error: null,
    rows: [],
    totalClicks: 0,
    attributedBookings: 0,
    totalPaidBookings: 0,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData({ data: { days } })
      .then((res) => {
        if (!alive) return;
        setState({
          loading: false,
          error: null,
          rows: res.rows,
          totalClicks: res.totalClicks,
          attributedBookings: res.attributedBookings,
          totalPaidBookings: res.totalPaidBookings,
        });
      })
      .catch((e: Error) => {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      });
    return () => {
      alive = false;
    };
  }, [days, fetchData]);

  const best = useMemo(() => state.rows[0], [state.rows]);

  return (
    <main className="min-h-screen bg-[color:var(--ivory)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/admin/bookings" className="text-[13px] underline">
          ← Bookings
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[color:var(--charcoal)]">
          Guide attribution
        </h1>
        <p className="mt-1 text-[14px] text-[color:var(--charcoal-soft)]">
          Clicks from each Journal guide onward to a tour, the Studio or another guide — and the
          paid bookings that followed.
        </p>

        <div className="mt-5 flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={`min-h-[44px] rounded-[2px] border px-4 text-[13px] ${
                days === r
                  ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-[color:var(--ivory)]"
                  : "border-[color:var(--gold-soft)] text-[color:var(--charcoal)]"
              }`}
            >
              {r} days
            </button>
          ))}
        </div>

        {state.loading && <p className="mt-8 text-[14px]">Loading…</p>}
        {state.error && <p className="mt-8 text-[14px] text-red-700">{state.error}</p>}

        {!state.loading && !state.error && (
          <>
            <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ["Guide clicks", String(state.totalClicks)],
                ["Bookings from guides", String(state.attributedBookings)],
                ["All paid bookings", String(state.totalPaidBookings)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[2px] bg-[color:var(--sand)] p-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            {best && (
              <p className="mt-4 text-[13px] text-[color:var(--charcoal-soft)]">
                Strongest guide right now: <strong>{best.guideSlug}</strong> — {best.clicks} clicks,{" "}
                {best.bookings} bookings.
              </p>
            )}

            {state.rows.length === 0 ? (
              <p className="mt-8 text-[14px]">
                No guide clicks recorded yet in this period. Data starts collecting as readers use
                the links inside the guides.
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {state.rows.map((r) => (
                  <li
                    key={r.guideSlug}
                    className="rounded-[2px] border border-[color:var(--gold-soft)]/50 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        to="/local-stories/$slug"
                        params={{ slug: r.guideSlug }}
                        className="text-[15px] font-medium underline"
                      >
                        {r.guideSlug}
                      </Link>
                      <span className="text-[13px] text-[color:var(--charcoal-soft)]">
                        {r.clicks} clicks · {r.bookings} bookings · {euros(r.revenueCents)}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-[color:var(--charcoal-soft)]">
                      {Object.entries(r.clicksBySlot)
                        .sort((a, b) => b[1] - a[1])
                        .map(([slot, n]) => `${slot}: ${n}`)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
