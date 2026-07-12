// Admin price-tier editor.
//
// Source of truth: the `tour_price_tiers` table in Supabase. Public site
// reads via `useTourPriceTiers()`. This page lets any signed-in user
// upsert the per-pax EUR tiers for guest counts 1..8 per tour. The code
// file `signatureToursViator.ts` no longer needs hand-edits for pricing.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RefreshCw, AlertTriangle, Check, Eye, EyeOff, CloudDownload, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import {
  TOUR_PRICE_TIERS_QUERY_KEY,
  TOUR_BANDED_TIERS_QUERY_KEY,
  useTourPriceTiers,
} from "@/hooks/use-tour-price-tiers";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import { SignaturePriceCard } from "@/components/studio-v3/SignaturePriceCard";
import type { AgeBand, BandedTiers } from "@/lib/pricing/ageBandPricing";

function AdminPricingErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20">
        <div className="container-x max-w-2xl">
          <h1 className="text-2xl">Pricing editor failed</h1>
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
        </div>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({
    meta: [
      { title: "Price tier editor — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPricingPage,
  errorComponent: AdminPricingErrorComponent,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

const TIERS: ReadonlyArray<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [1, 2, 3, 4, 5, 6, 7, 8];

type TierFormState = Record<string, string>; // "1".."8" → input string

function toFormState(tiers: PriceTiersEUR | undefined): TierFormState {
  const out: TierFormState = {};
  for (const k of TIERS) {
    const v = tiers?.[k];
    out[String(k)] = typeof v === "number" && v > 0 ? String(v) : "";
  }
  return out;
}

function parseFormState(state: TierFormState): PriceTiersEUR {
  const out: PriceTiersEUR = {};
  for (const k of TIERS) {
    const raw = state[String(k)]?.trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    (out as Record<string, number>)[String(k)] = Math.round(n);
  }
  return out;
}

function tiersEqual(a: PriceTiersEUR | undefined, b: PriceTiersEUR): boolean {
  for (const k of TIERS) {
    const av = a?.[k];
    const bv = b[k];
    if ((av ?? null) !== (bv ?? null)) return false;
  }
  return true;
}

function AdminPricingPage() {
  const queryClient = useQueryClient();
  const { data: overrides, isLoading, refetch } = useTourPriceTiers();
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tours = useMemo(
    () => [...signatureTours].sort((a, b) => a.title.localeCompare(b.title)),
    [],
  );

  if (!authChecked || isLoading) {
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
          <h1 className="text-3xl">Price tier editor</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Sign in to edit price tiers.
          </p>
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
            Your account ({session.email ?? session.id}) does not have the
            <code className="mx-1 px-1 bg-[color:var(--sand)]">admin</code>
            role. Ask a workspace owner to grant it before editing pricing.
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
              <h1 className="text-3xl tracking-tight">Price tier editor</h1>
              <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-xl">
                Real per-pax EUR price by group size (1–8). Tier 8 is the public &ldquo;from&rdquo;
                anchor. Leave a cell blank to clear that tier. Changes go live as soon as you save.
              </p>
            </div>
            <div className="text-xs text-[color:var(--charcoal-soft)]">
              Signed in as {session.email ?? "—"}{" "}
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="ml-2 underline hover:no-underline"
              >
                Sign out
              </button>
            </div>
          </header>

          <SyncFromBokunPanel
            tours={tours}
            onApplied={async () => {
              await queryClient.invalidateQueries({ queryKey: TOUR_PRICE_TIERS_QUERY_KEY });
              await queryClient.invalidateQueries({ queryKey: TOUR_BANDED_TIERS_QUERY_KEY });
              await refetch();
            }}
          />

          <BokunCategoryMappingPanel tours={tours} />

          <div className="mt-8 space-y-5">
            {tours.map((tour) => (
              <TourRow
                key={tour.id}
                tour={tour}
                initialTiers={overrides?.[tour.id]}
                onSaved={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: TOUR_PRICE_TIERS_QUERY_KEY,
                  });
                  await refetch();
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function TourRow({
  tour,
  initialTiers,
  onSaved,
}: {
  tour: SignatureTour;
  initialTiers: PriceTiersEUR | undefined;
  onSaved: () => Promise<void> | void;
}) {
  const { id: tourId, title, region, priceFrom } = tour;
  const [form, setForm] = useState<TierFormState>(() => toFormState(initialTiers));
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewGuests, setPreviewGuests] = useState<number>(2);

  // Keep the form in sync when the cached query refetches.
  useEffect(() => {
    setForm(toFormState(initialTiers));
  }, [initialTiers]);

  const parsed = useMemo(() => parseFormState(form), [form]);
  const dirty = !tiersEqual(initialTiers, parsed);

  const tier8 = parsed[8];
  const anchorMismatch = typeof tier8 === "number" && tier8 !== priceFrom;

  async function save() {
    setBusy(true);
    try {
      const payload: PriceTiersEUR = parsed;
      const { error } = await supabase.from("tour_price_tiers").upsert(
        {
          tour_id: tourId,
          tiers: payload as unknown as Record<string, number>,
        },
        { onConflict: "tour_id" },
      );
      if (error) throw error;
      toast.success(`Saved ${title}`);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1500);
      await onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border border-[color:var(--border)] bg-white p-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold leading-snug">{title}</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {region} · id: {tourId} · priceFrom €{priceFrom}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="inline-flex items-center gap-2 border border-[color:var(--border)] px-3 py-2 text-xs uppercase tracking-[0.18em] hover:border-[color:var(--gold)]"
            aria-expanded={previewOpen}
          >
            {previewOpen ? <EyeOff size={14} /> : <Eye size={14} />}
            {previewOpen ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={save}
            className="inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-4 py-2 text-xs uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black"
          >
            {justSaved ? <Check size={14} /> : <Save size={14} />}
            {busy ? "Saving…" : justSaved ? "Saved" : "Save"}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {TIERS.map((tier) => (
          <label key={tier} className="block">
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              {tier} pax
            </span>
            <div className="mt-1 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[color:var(--charcoal-soft)]">
                €
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form[String(tier)] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [String(tier)]: e.target.value }))}
                placeholder="—"
                className="w-full border border-[color:var(--border)] bg-white pl-5 pr-2 py-1.5 text-sm tabular-nums focus:outline-none focus:border-[color:var(--gold)]"
              />
            </div>
          </label>
        ))}
      </div>

      {anchorMismatch ? (
        <p className="mt-3 inline-flex items-center gap-2 text-[11px] text-amber-700">
          <AlertTriangle size={12} />
          Tier 8 (€{tier8}) differs from the public &ldquo;from&rdquo; anchor (€{priceFrom}). Update
          the tour&rsquo;s `priceFrom` in code to match, or set tier 8 to €{priceFrom}.
        </p>
      ) : null}

      {previewOpen ? (
        <div className="mt-5 border-t border-[color:var(--border)] pt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              Public card preview{dirty ? " · unsaved tiers" : " · saved tiers"}
            </p>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-[color:var(--charcoal-soft)]">Guests</span>
              <select
                value={previewGuests}
                onChange={(e) => setPreviewGuests(Number(e.target.value))}
                className="border border-[color:var(--border)] bg-white px-2 py-1 text-sm"
              >
                {TIERS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-w-md mx-auto">
            <SignaturePriceCard
              tour={tour}
              stopCount={tour.stops?.length ?? 0}
              dateExact={null}
              onSecure={() => {}}
              onRefine={() => {}}
              guests={previewGuests}
              showAddOns={false}
              previewTiers={parsed}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sync from Bókun panel
// ─────────────────────────────────────────────────────────────────────────

type MappedBokunPricingCategory = {
  bokunCategoryId: string;
  bokunTitle: string;
  minAge?: number;
  maxAge?: number;
  uiBand: AgeBand | "other";
  countsTowardCapacity: boolean;
  normallyFree: boolean;
  mappingStatus: "confirmed" | "suggested" | "unmapped";
};

type SyncBefore = {
  syncedTiers: BandedTiers | null;
  overrideTiers: BandedTiers | null;
  bokunCategories: MappedBokunPricingCategory[] | null;
  pricingMode: string | null;
  syncedAt: string | null;
} | null;

type SyncAfter = {
  syncedTiers: BandedTiers | null;
  bokunCategories: MappedBokunPricingCategory[];
  pricingMode: string;
} | null;

type SyncOneResult = {
  tourId: string;
  productId: string;
  ok: boolean;
  before: SyncBefore;
  after: SyncAfter;
  warnings?: string[];
  reason?: string;
};

type SyncResponse = {
  dryRun: boolean;
  count: number;
  okCount: number;
  results: SyncOneResult[];
};

const BANDS: AgeBand[] = ["adult", "youth", "child"];
const BUCKETS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// Adapt the new richer response into the flat BandedTiers the diff view uses.
function beforeTiers(r: SyncOneResult): BandedTiers | null {
  return r.before?.syncedTiers ?? null;
}
function afterTiers(r: SyncOneResult): BandedTiers | null {
  return r.after?.syncedTiers ?? null;
}

function tierVal(t: BandedTiers | null | undefined, band: AgeBand, b: number): number | null {
  if (!t) return null;
  const map = (t as unknown as Record<string, Record<string, number> | undefined>)[band];
  const v = map?.[String(b)];
  return typeof v === "number" && v > 0 ? v : null;
}

function bandChanged(before: BandedTiers | null, after: BandedTiers | null, band: AgeBand): boolean {
  for (const b of BUCKETS) if (tierVal(before, band, b) !== tierVal(after, band, b)) return true;
  return false;
}

function infantChanged(before: BandedTiers | null, after: BandedTiers | null): boolean {
  return (before?.infant ?? null) !== (after?.infant ?? null);
}

function resultChanged(r: SyncOneResult): boolean {
  if (!r.ok) return false;
  const b = beforeTiers(r);
  const a = afterTiers(r);
  if (BANDS.some((band) => bandChanged(b, a, band))) return true;
  if (infantChanged(b, a)) return true;
  return false;
}

function SyncFromBokunPanel({
  tours,
  onApplied,
}: {
  tours: SignatureTour[];
  onApplied: () => Promise<void> | void;
}) {
  const [scope, setScope] = useState<string>("all"); // "all" or tourId
  const [preview, setPreview] = useState<SyncResponse | null>(null);
  const [previewScope, setPreviewScope] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [applying, setApplying] = useState(false);

  async function invokeSync(dryRun: boolean): Promise<SyncResponse | null> {
    const body: Record<string, unknown> = { dryRun };
    if (scope !== "all") body.tourId = scope;
    const { data, error } = await supabase.functions.invoke("sync-bokun-pricing", { body });
    if (error) {
      toast.error(`Bókun sync failed: ${error.message}`);
      return null;
    }
    return data as SyncResponse;
  }

  async function doPreview() {
    setFetching(true);
    setPreview(null);
    try {
      const res = await invokeSync(true);
      if (res) {
        setPreview(res);
        setPreviewScope(scope);
      }
    } finally {
      setFetching(false);
    }
  }

  async function doApply() {
    if (!preview) return;
    const changed = preview.results.filter(resultChanged).length;
    if (!changed) return;
    if (!window.confirm(`Overwrite pricing for ${changed} tour(s) with Bókun values?`)) return;
    setApplying(true);
    try {
      const res = await invokeSync(false);
      if (res) {
        toast.success(`Applied Bókun sync to ${res.okCount}/${res.count} tour(s)`);
        setPreview(null);
        setPreviewScope(null);
        await onApplied();
      }
    } finally {
      setApplying(false);
    }
  }

  const changedCount = preview?.results.filter(resultChanged).length ?? 0;
  const failed = preview?.results.filter((r) => !r.ok) ?? [];
  const staleScope = preview != null && previewScope !== scope;

  return (
    <section className="mt-8 border border-[color:var(--border)] bg-[color:var(--sand)]/40 p-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CloudDownload size={16} /> Sync from Bókun
          </h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)] max-w-xl">
            Preview shows the per-tour diff (adult/youth/child/infant, buckets 1–8, and category
            mapping). Nothing is written until you apply.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
            }}
            className="border border-[color:var(--border)] bg-white px-2 py-2 text-sm"
            disabled={fetching || applying}
          >
            <option value="all">All tours</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={doPreview}
            disabled={fetching || applying}
            className="inline-flex items-center gap-2 border border-[color:var(--charcoal)] px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-[color:var(--charcoal)] hover:text-[color:var(--ivory)] disabled:opacity-40"
          >
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {fetching ? "Fetching…" : "Preview sync"}
          </button>
        </div>
      </header>

      {preview ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[color:var(--charcoal-soft)]">
            <span>
              Preview: {preview.count} tour(s) · {changedCount} changed ·{" "}
              {preview.okCount} ok · {failed.length} failed
              {staleScope ? " · scope changed, re-preview" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setPreviewScope(null);
                }}
                className="border border-[color:var(--border)] px-3 py-1.5 hover:border-[color:var(--gold)]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={doApply}
                disabled={applying || changedCount === 0 || staleScope}
                className="inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-4 py-1.5 uppercase tracking-[0.18em] hover:bg-black disabled:opacity-40"
              >
                {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Apply {changedCount} change{changedCount === 1 ? "" : "s"}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {preview.results.map((r) => (
              <SyncDiffRow key={r.tourId} result={r} tourTitle={tours.find((t) => t.id === r.tourId)?.title ?? r.tourId} />
            ))}
            {preview.results.length === 0 ? (
              <p className="text-xs text-[color:var(--charcoal-soft)]">
                No Bókun mappings found. Add rows to <code>tour_bokun_mapping</code> first.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SyncDiffRow({ result, tourTitle }: { result: SyncOneResult; tourTitle: string }) {
  const changed = resultChanged(result);
  const status = !result.ok ? "failed" : changed ? "changed" : "unchanged";
  const statusColor =
    status === "failed"
      ? "text-red-700 bg-red-50 border-red-200"
      : status === "changed"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-[color:var(--charcoal-soft)] bg-white border-[color:var(--border)]";

  return (
    <article className="border border-[color:var(--border)] bg-white p-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-medium">{tourTitle}</div>
        <span className={`text-[10px] uppercase tracking-[0.18em] border px-2 py-0.5 ${statusColor}`}>
          {status}
          {result.reason ? ` · ${result.reason}` : ""}
        </span>
      </header>

      {result.ok && changed ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                <th className="text-left font-normal py-1 pr-3">Band</th>
                {BUCKETS.map((b) => (
                  <th key={b} className="text-right font-normal py-1 px-1">
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const beforeT = beforeTiers(result);
                const afterT = afterTiers(result);
                return (
                  <>
                    {BANDS.map((band) => (
                      <tr key={band} className="border-t border-[color:var(--border)]">
                        <td className="py-1 pr-3 capitalize">{band}</td>
                        {BUCKETS.map((b) => {
                          const before = tierVal(beforeT, band, b);
                          const after = tierVal(afterT, band, b);
                          const diff = before !== after;
                          const cls = !diff
                            ? "text-[color:var(--charcoal-soft)]"
                            : before == null
                            ? "text-green-700"
                            : after == null
                            ? "text-red-700 line-through"
                            : "text-amber-800 font-medium";
                          return (
                            <td key={b} className={`text-right py-1 px-1 ${cls}`}>
                              {before == null && after == null
                                ? "—"
                                : diff
                                ? `${before ?? "–"}→${after ?? "–"}`
                                : after}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {infantChanged(beforeT, afterT) ? (
                      <tr className="border-t border-[color:var(--border)]">
                        <td className="py-1 pr-3">Infant</td>
                        <td colSpan={8} className="text-right py-1 px-1 text-amber-800">
                          {beforeT?.infant ?? "–"} → {afterT?.infant ?? "–"}
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })()}
            </tbody>
          </table>

          {result.after?.bokunCategories?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.after.bokunCategories.map((c) => {
                const range =
                  c.minAge != null || c.maxAge != null
                    ? ` · ${c.minAge ?? 0}${c.maxAge != null ? `–${c.maxAge}` : "+"}`
                    : "";
                const statusColor =
                  c.mappingStatus === "confirmed"
                    ? "border-emerald-300 bg-emerald-50"
                    : c.mappingStatus === "suggested"
                    ? "border-amber-300 bg-amber-50"
                    : "border-red-300 bg-red-50";
                return (
                  <span
                    key={c.bokunCategoryId}
                    className={`text-[10px] uppercase tracking-[0.14em] border px-2 py-0.5 ${statusColor}`}
                    title={`${c.mappingStatus} · uiBand=${c.uiBand}`}
                  >
                    <span className="capitalize">{c.uiBand}</span> · #{c.bokunCategoryId} · {c.bokunTitle}
                    {range}
                  </span>
                );
              })}
            </div>
          ) : null}

          {result.after?.pricingMode ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              pricing mode: {result.after.pricingMode}
            </p>
          ) : null}

          {result.warnings?.length ? (
            <ul className="mt-2 text-[11px] text-amber-800 list-disc list-inside space-y-0.5">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
