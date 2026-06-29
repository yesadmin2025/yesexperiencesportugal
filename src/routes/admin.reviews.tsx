/**
 * /admin/reviews — enter per-platform rating counts and curate display reviews.
 *
 * Two sections:
 *  1) Per-tour external ratings: paste real numbers from Viator/Tripadvisor/GYG/Google.
 *  2) Curated reviews: add real review quotes for display (first-party
 *     submissions arrive here automatically via the public form).
 *
 * Schema is emitted only for first-party rows on the consumer side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listExternalRatings,
  upsertExternalRating,
  deleteExternalRating,
  listReviews,
  upsertReview,
  deleteReview,
  createReviewToken,
  listPendingReviews,
  moderateReview,
  bulkModerateReviews,
  type ReviewSource,
} from "@/lib/reviewsAdmin.functions";
import { scrapeTourReviews, listScrapeRuns } from "@/lib/reviewsScrape.functions";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
  head: () => ({
    meta: [
      { title: "Reviews · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-700">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const TOUR_IDS = [
  "arrabida-wine-allinclusive",
  "wild-beaches-picnic",
  "arrabida-boat",
  "tiles-workshop",
  "azeitao-cheese",
  "sintra-cascais",
  "troia-comporta",
  "evora-alentejo",
  "tomar-coimbra",
  "fatima-nazare-obidos",
  "roman-heritage-alentejo",
];

const SOURCES: ReviewSource[] = ["viator", "tripadvisor", "getyourguide", "google"];

type ExtRow = {
  id: string;
  tour_id: string;
  source: ReviewSource;
  rating: number;
  review_count: number;
  source_url: string | null;
  last_verified_at: string;
};

type ReviewRow = {
  id: string;
  tour_id: string;
  source: ReviewSource;
  rating: number;
  title: string | null;
  body: string;
  reviewer_name: string | null;
  reviewer_country: string | null;
  source_url: string | null;
  is_first_party: boolean;
  verified: boolean;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
};

function AdminReviewsPage() {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">
      <h1 className="text-3xl font-medium text-[color:var(--charcoal)]">Reviews</h1>
      <p className="mt-2 text-[color:var(--charcoal)]/70 text-sm">
        Real data only. Scraped platform reviews go to the approval queue —
        nothing appears on /reviews or in JSON-LD until you approve it.
      </p>

      <ApprovalQueueSection />
      <ExternalRatingsSection />
      <ScrapeSection />
      <ReviewsSection />
      <TokenSection />
    </div>
  );
}

// -------------------- Scrape platform reviews --------------------

type ScrapeRun = {
  id: string;
  tour_id: string;
  source: string;
  source_url: string | null;
  status: string;
  fetched_count: number;
  inserted_count: number;
  updated_count: number;
  error: string | null;
  created_at: string;
};

function ScrapeSection() {
  const scrapeFn = useServerFn(scrapeTourReviews);
  const runsFn = useServerFn(listScrapeRuns);
  const [tourId, setTourId] = useState(TOUR_IDS[0]);
  const [source, setSource] = useState<"viator" | "tripadvisor" | "getyourguide">("viator");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [runs, setRuns] = useState<ScrapeRun[]>([]);

  async function refresh() {
    try {
      setRuns(((await runsFn({ data: {} })) as ScrapeRun[]).slice(0, 12));
    } catch {
      /* noop */
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onScrape(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = (await scrapeFn({
        data: { tour_id: tourId, source, source_url: url },
      })) as { fetched: number; inserted: number; updated: number; skipped: number };
      setMsg(
        `Fetched ${res.fetched} · inserted ${res.inserted} · updated ${res.updated} · skipped ${res.skipped}. All scraped reviews are queued for approval above.`,
      );
      await refresh();
    } catch (err) {
      setMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Scrape platform reviews</h2>
      <p className="text-sm text-[color:var(--charcoal)]/65 mt-1">
        Paste the public Viator / Tripadvisor / GetYourGuide listing URL. Real review
        cards are extracted by Firecrawl, deduped per source, and stored verbatim.
        Ratings &lt; 4 are inserted as <em>unpublished</em>; you choose what to show.
      </p>

      <form onSubmit={onScrape} className="mt-4 grid gap-2 md:grid-cols-6 items-end">
        <label className="md:col-span-2 text-sm">
          Tour
          <select
            value={tourId}
            onChange={(e) => setTourId(e.target.value)}
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          >
            {TOUR_IDS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          >
            <option value="viator">Viator</option>
            <option value="tripadvisor">Tripadvisor</option>
            <option value="getyourguide">GetYourGuide</option>
          </select>
        </label>
        <label className="md:col-span-2 text-sm">
          Public listing URL
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          />
        </label>
        <button
          disabled={busy}
          className="bg-[color:var(--teal)] text-white px-3 py-2 rounded text-sm disabled:opacity-60"
        >
          {busy ? "Scraping…" : "Scrape now"}
        </button>
      </form>

      {msg && (
        <p className="mt-3 text-sm text-[color:var(--charcoal)]/80">{msg}</p>
      )}

      {runs.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55">
            Recent runs
          </div>
          <ul className="mt-2 divide-y divide-[color:var(--charcoal)]/10 text-sm list-none p-0">
            {runs.map((r) => (
              <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium">{r.tour_id}</span>
                <span className="uppercase text-[11px] tracking-wide text-[color:var(--charcoal)]/60">
                  {r.source}
                </span>
                <span
                  className={
                    r.status === "ok"
                      ? "text-emerald-700"
                      : r.status === "error"
                        ? "text-red-700"
                        : "text-[color:var(--charcoal)]/60"
                  }
                >
                  {r.status}
                </span>
                <span className="text-[color:var(--charcoal)]/70">
                  fetched {r.fetched_count} · inserted {r.inserted_count}
                </span>
                <span className="text-[11px] text-[color:var(--charcoal)]/50">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                {r.error && (
                  <span className="text-[11px] text-red-700/80 basis-full">
                    {r.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// -------------------- External ratings --------------------

function ExternalRatingsSection() {
  const listFn = useServerFn(listExternalRatings);
  const upsertFn = useServerFn(upsertExternalRating);
  const delFn = useServerFn(deleteExternalRating);
  const [rows, setRows] = useState<ExtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tourId, setTourId] = useState(TOUR_IDS[0]);
  const [source, setSource] = useState<ReviewSource>("viator");
  const [rating, setRating] = useState("4.9");
  const [count, setCount] = useState("");
  const [url, setUrl] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setRows((await listFn({})) as ExtRow[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertFn({
        data: {
          tour_id: tourId,
          source,
          rating: Number(rating),
          review_count: Number(count),
          source_url: url || null,
        },
      });
      setCount("");
      setUrl("");
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ExtRow[]>();
    for (const r of rows) {
      const arr = map.get(r.tour_id) ?? [];
      arr.push(r);
      map.set(r.tour_id, arr);
    }
    return map;
  }, [rows]);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-medium">Per-platform rating counts</h2>
      <p className="text-sm text-[color:var(--charcoal)]/65 mt-1">
        Paste the real average + count from each platform's product page.
      </p>

      <form onSubmit={onSave} className="mt-4 grid gap-2 md:grid-cols-6 items-end">
        <label className="md:col-span-2 text-sm">
          Tour
          <select
            value={tourId}
            onChange={(e) => setTourId(e.target.value)}
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          >
            {TOUR_IDS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as ReviewSource)}
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Rating
          <input
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          # Reviews
          <input
            type="number"
            min="0"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            required
            className="mt-1 w-full border rounded px-2 py-1.5 text-sm"
          />
        </label>
        <button
          disabled={busy}
          className="bg-[color:var(--teal)] text-white px-3 py-2 rounded text-sm disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <input
          placeholder="Source URL (https://www.viator.com/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="md:col-span-6 border rounded px-2 py-1.5 text-sm"
        />
      </form>

      <div className="mt-6">
        {loading && <p className="text-sm">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-[color:var(--charcoal)]/60">No ratings yet.</p>
        )}
        {Array.from(grouped.entries()).map(([tid, list]) => (
          <div key={tid} className="border rounded p-3 mb-3">
            <div className="font-medium text-sm">{tid}</div>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-[color:var(--charcoal)]/60">
                  <th className="py-1">Source</th>
                  <th>Rating</th>
                  <th>Count</th>
                  <th>URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1.5">{r.source}</td>
                    <td>{r.rating}</td>
                    <td>{r.review_count}</td>
                    <td className="truncate max-w-[280px]">
                      {r.source_url && (
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-[color:var(--teal)]"
                        >
                          link
                        </a>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this entry?")) return;
                          await delFn({ data: { id: r.id } });
                          await refresh();
                        }}
                        className="text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

// -------------------- Reviews (display) --------------------

function ReviewsSection() {
  const listFn = useServerFn(listReviews);
  const upsertFn = useServerFn(upsertReview);
  const delFn = useServerFn(deleteReview);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    tour_id: TOUR_IDS[0],
    source: "viator" as ReviewSource,
    rating: 5,
    title: "",
    body: "",
    reviewer_name: "",
    reviewer_country: "",
    source_url: "",
    is_featured: false,
    verified: false,
  });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setRows((await listFn({ data: filter ? { tourId: filter } : {} })) as ReviewRow[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertFn({
        data: {
          ...form,
          title: form.title || null,
          reviewer_name: form.reviewer_name || null,
          reviewer_country: form.reviewer_country || null,
          source_url: form.source_url || null,
        },
      });
      setForm({ ...form, title: "", body: "", reviewer_name: "", reviewer_country: "", source_url: "" });
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Display reviews</h2>
      <p className="text-sm text-[color:var(--charcoal)]/65 mt-1">
        Add real review quotes (third-party reviews must link to the original).
        First-party reviews arrive here automatically via the public form.
      </p>

      <form onSubmit={onAdd} className="mt-4 grid gap-2 md:grid-cols-4">
        <select
          value={form.tour_id}
          onChange={(e) => setForm({ ...form, tour_id: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        >
          {TOUR_IDS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value as ReviewSource })}
          className="border rounded px-2 py-1.5 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option value="first_party">first_party</option>
        </select>
        <input
          type="number"
          min="1"
          max="5"
          step="0.1"
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <button
          disabled={busy}
          className="bg-[color:var(--teal)] text-white px-3 py-2 rounded text-sm disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add"}
        </button>
        <input
          placeholder="Reviewer name"
          value={form.reviewer_name}
          onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm md:col-span-2"
        />
        <input
          placeholder="Country"
          value={form.reviewer_country}
          onChange={(e) => setForm({ ...form, reviewer_country: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <label className="text-xs flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
          />
          Featured on homepage
        </label>
        <input
          placeholder="Title (optional)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm md:col-span-4"
        />
        <textarea
          required
          placeholder="Review body (real text only)"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={3}
          className="border rounded px-2 py-1.5 text-sm md:col-span-4"
        />
        <input
          placeholder="Source URL (link to the original review)"
          value={form.source_url}
          onChange={(e) => setForm({ ...form, source_url: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm md:col-span-4"
        />
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm">Filter by tour:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {TOUR_IDS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        {loading && <p className="text-sm">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-[color:var(--charcoal)]/60">No reviews yet.</p>
        )}
        <ul className="space-y-3 list-none p-0">
          {rows.map((r) => (
            <li key={r.id} className="border rounded p-3 text-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <strong>{r.tour_id}</strong> · {r.source} · {r.rating}★
                  {r.is_featured && (
                    <span className="ml-2 text-[10px] bg-[color:var(--gold)]/20 px-1.5 py-0.5 rounded">
                      featured
                    </span>
                  )}
                  {r.is_first_party && (
                    <span className="ml-2 text-[10px] bg-[color:var(--teal)]/15 px-1.5 py-0.5 rounded">
                      first-party
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this review?")) return;
                    await delFn({ data: { id: r.id } });
                    await refresh();
                  }}
                  className="text-red-700 text-xs"
                >
                  Delete
                </button>
              </div>
              {r.title && <div className="mt-1 font-medium">{r.title}</div>}
              <p className="mt-1 text-[color:var(--charcoal)]/85">{r.body}</p>
              <div className="mt-1 text-xs text-[color:var(--charcoal)]/60">
                {r.reviewer_name ?? "—"}
                {r.reviewer_country ? ` · ${r.reviewer_country}` : ""}
                {r.source_url && (
                  <>
                    {" · "}
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      source
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// -------------------- Tokens (first-party invites) --------------------

function TokenSection() {
  const createFn = useServerFn(createReviewToken);
  const [form, setForm] = useState({
    tour_id: TOUR_IDS[0],
    guest_email: "",
    guest_name: "",
  });
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const row = await createFn({ data: form });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://yesexperiencesportugal.com";
      setLast(`${origin}/review/${(row as { token: string }).token}`);
      setForm({ ...form, guest_email: "", guest_name: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 mb-20">
      <h2 className="text-xl font-medium">First-party review invites</h2>
      <p className="text-sm text-[color:var(--charcoal)]/65 mt-1">
        Generate a one-time link to send a past guest. Their review is auto-marked verified
        and is the only kind we expose to schema.
      </p>
      <form onSubmit={onCreate} className="mt-3 grid gap-2 md:grid-cols-4">
        <select
          value={form.tour_id}
          onChange={(e) => setForm({ ...form, tour_id: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        >
          {TOUR_IDS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          required
          type="email"
          placeholder="Guest email"
          value={form.guest_email}
          onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Guest name (optional)"
          value={form.guest_name}
          onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        />
        <button
          disabled={busy}
          className="bg-[color:var(--teal)] text-white px-3 py-2 rounded text-sm disabled:opacity-60"
        >
          {busy ? "…" : "Generate link"}
        </button>
      </form>
      {last && (
        <div className="mt-3 p-3 bg-[color:var(--ivory)] rounded text-sm break-all">
          <div className="font-medium mb-1">Send this to the guest:</div>
          <code>{last}</code>
        </div>
      )}
    </section>
  );
}
