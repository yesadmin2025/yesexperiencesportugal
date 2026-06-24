// Admin Bokun mapping editor.
//
// Source of truth: the `tour_bokun_mapping` table in Supabase. Lets an admin
// pick the correct Bokun product for each Signature tour so checkout can
// later push reservations into Bokun. Bokun catalog is fetched live via the
// `bokun-list-products` edge function.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Save, Check, ExternalLink, Search } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";

type BokunItem = {
  id: number | string;
  title: string;
  productCode: string | null;
  durationText: string | null;
  currency: string | null;
  nextDefaultPrice: number | null;
};

type Mapping = {
  tour_id: string;
  bokun_product_id: string;
  bokun_title: string | null;
  bokun_product_code: string | null;
  notes: string | null;
};

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Bokun mapping failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/admin/bokun-mapping")({
  head: () => ({
    meta: [
      { title: "Bokun mapping — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBokunMappingPage,
  errorComponent: ErrorView,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

/** Lightweight token-overlap score so we can pre-pick the most likely Bokun product per tour. */
function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
  const ta = new Set(norm(a));
  const tb = new Set(norm(b));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.max(ta.size, tb.size);
}

function AdminBokunMappingPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);

  const [bokunItems, setBokunItems] = useState<BokunItem[] | null>(null);
  const [bokunError, setBokunError] = useState<string | null>(null);
  const [loadingBokun, setLoadingBokun] = useState(false);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});

  useEffect(() => {
    let cancelled = false;
    async function load(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!!data);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => load(s));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load existing mappings
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("tour_bokun_mapping")
      .select("tour_id, bokun_product_id, bokun_title, bokun_product_code, notes")
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load mappings: " + error.message);
          return;
        }
        const map: Record<string, Mapping> = {};
        for (const row of data ?? []) map[row.tour_id] = row as Mapping;
        setMappings(map);
      });
  }, [isAdmin]);

  async function fetchBokun() {
    setLoadingBokun(true);
    setBokunError(null);
    try {
      const { data, error } = await supabase.functions.invoke("bokun-list-products", {
        body: {},
      });
      if (error) throw error;
      const items = (data?.items ?? []) as BokunItem[];
      items.sort((a, b) => String(a.title).localeCompare(String(b.title)));
      setBokunItems(items);
      toast.success(`Loaded ${items.length} Bokun products`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBokunError(msg);
      toast.error("Bokun fetch failed: " + msg);
    } finally {
      setLoadingBokun(false);
    }
  }

  useEffect(() => {
    if (isAdmin && !bokunItems && !loadingBokun) fetchBokun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const tours = useMemo(
    () => [...signatureTours].sort((a, b) => a.title.localeCompare(b.title)),
    [],
  );

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-5xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Bokun mapping</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">Sign in to continue.</p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-5 py-2.5 text-sm hover:bg-black"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Not authorized</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Your account ({session.email ?? session.id}) needs the admin role.
          </p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-5xl">
          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl tracking-tight">Bokun mapping</h1>
              <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-xl">
                Pick the Bokun product that matches each Signature tour. The checkout will use this
                mapping when pushing reservations into Bokun.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchBokun}
              disabled={loadingBokun}
              className="inline-flex items-center gap-2 border border-[color:var(--border)] px-3 py-2 text-xs hover:border-[color:var(--gold)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={loadingBokun ? "animate-spin" : ""} />
              {loadingBokun ? "Loading Bokun…" : "Refresh catalog"}
            </button>
          </header>

          {bokunError && (
            <div className="mt-6 border border-red-400/40 bg-red-50 px-4 py-3 text-sm text-red-800">
              {bokunError}
            </div>
          )}

          <div className="mt-8 space-y-4">
            {tours.map((tour) => (
              <TourMappingRow
                key={tour.id}
                tour={tour}
                bokunItems={bokunItems ?? []}
                existing={mappings[tour.id]}
                onSaved={(m) => setMappings((prev) => ({ ...prev, [tour.id]: m }))}
                onCleared={() =>
                  setMappings((prev) => {
                    const n = { ...prev };
                    delete n[tour.id];
                    return n;
                  })
                }
              />
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function TourMappingRow({
  tour,
  bokunItems,
  existing,
  onSaved,
  onCleared,
}: {
  tour: SignatureTour;
  bokunItems: BokunItem[];
  existing: Mapping | undefined;
  onSaved: (m: Mapping) => void;
  onCleared: () => void;
}) {
  const suggestions = useMemo(() => {
    if (!bokunItems.length) return [];
    return bokunItems
      .map((it) => ({ it, score: similarity(tour.title, String(it.title)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [bokunItems, tour.title]);

  const initialSelected = existing?.bokun_product_id ?? suggestions[0]?.it.id?.toString() ?? "";
  const [selected, setSelected] = useState<string>(initialSelected);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setSelected(existing?.bokun_product_id ?? suggestions[0]?.it.id?.toString() ?? "");
    setNotes(existing?.notes ?? "");
  }, [existing, suggestions]);

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return bokunItems;
    const f = filter.toLowerCase();
    return bokunItems.filter(
      (it) =>
        String(it.title).toLowerCase().includes(f) ||
        String(it.id).includes(f) ||
        (it.productCode ?? "").toLowerCase().includes(f),
    );
  }, [bokunItems, filter]);

  const selectedItem = bokunItems.find((it) => String(it.id) === selected);

  async function save() {
    if (!selected) {
      toast.error("Pick a Bokun product first");
      return;
    }
    setBusy(true);
    const item = bokunItems.find((it) => String(it.id) === selected);
    const payload = {
      tour_id: tour.id,
      bokun_product_id: selected,
      bokun_title: item?.title ?? null,
      bokun_product_code: item?.productCode ?? null,
      currency: item?.currency ?? "EUR",
      notes: notes.trim() || null,
    };
    const { error } = await supabase
      .from("tour_bokun_mapping")
      .upsert(payload, { onConflict: "tour_id" });
    setBusy(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    onSaved({
      tour_id: tour.id,
      bokun_product_id: payload.bokun_product_id,
      bokun_title: payload.bokun_title,
      bokun_product_code: payload.bokun_product_code,
      notes: payload.notes,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    toast.success(`${tour.title} → ${item?.title ?? selected}`);
  }

  async function clearMapping() {
    if (!existing) return;
    if (!confirm(`Clear Bokun mapping for "${tour.title}"?`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("tour_bokun_mapping")
      .delete()
      .eq("tour_id", tour.id);
    setBusy(false);
    if (error) {
      toast.error("Clear failed: " + error.message);
      return;
    }
    onCleared();
    setSelected("");
    toast.success("Mapping cleared");
  }

  const isMapped = !!existing;

  return (
    <div
      className={`border ${
        isMapped ? "border-[color:var(--gold)]/40" : "border-[color:var(--border)]"
      } bg-white px-5 py-4`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium">{tour.title}</h3>
            {isMapped && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] bg-[color:var(--gold)]/15 text-[color:var(--charcoal)] px-2 py-0.5">
                <Check size={10} /> Mapped
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[color:var(--charcoal-soft)]">
            {tour.region} · ID <code>{tour.id}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMapped && (
            <button
              type="button"
              onClick={clearMapping}
              disabled={busy}
              className="text-xs text-[color:var(--charcoal-soft)] underline hover:text-[color:var(--charcoal)] disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy || !selected}
            className="inline-flex items-center gap-1.5 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-3 py-1.5 text-xs hover:bg-black disabled:opacity-50"
          >
            {justSaved ? <Check size={12} /> : <Save size={12} />}
            {justSaved ? "Saved" : busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {!bokunItems.length ? (
        <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
          Loading Bokun catalog…
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
          <div>
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--charcoal-soft)]"
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search Bokun catalog…"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-[color:var(--border)] focus:border-[color:var(--gold)] outline-none"
              />
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-2 w-full px-2 py-1.5 text-sm border border-[color:var(--border)] focus:border-[color:var(--gold)] outline-none bg-white"
            >
              <option value="">— Select Bokun product —</option>
              {suggestions.length > 0 && (
                <optgroup label="Suggested matches">
                  {suggestions.map(({ it, score }) => (
                    <option key={`s-${it.id}`} value={String(it.id)}>
                      {`★ ${it.title} (${Math.round(score * 100)}% · #${it.id})`}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All products">
                {filteredItems.map((it) => (
                  <option key={it.id} value={String(it.id)}>
                    {`${it.title} · #${it.id}${it.productCode ? ` · ${it.productCode}` : ""}`}
                  </option>
                ))}
              </optgroup>
            </select>
            {selectedItem && (
              <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">
                <span className="text-[color:var(--charcoal)]">{selectedItem.title}</span>
                {selectedItem.durationText && <> · {selectedItem.durationText}</>}
                {selectedItem.nextDefaultPrice != null && (
                  <> · from {selectedItem.currency ?? "EUR"} {selectedItem.nextDefaultPrice}</>
                )}
              </p>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={1}
              className="mt-2 w-full px-2 py-1.5 text-xs border border-[color:var(--border)] focus:border-[color:var(--gold)] outline-none resize-none"
            />
          </div>
          <a
            href={`/tours/${tour.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[color:var(--charcoal-soft)] hover:text-[color:var(--gold)] whitespace-nowrap"
          >
            View tour <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}
