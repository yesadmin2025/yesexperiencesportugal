/**
 * Quick pricing tool.
 *
 * Type a moment's name, set its price and minimum guests, save. Writes to the
 * same source of truth as the price map (`studio_composable_stops`), so
 * /admin/price-map refreshes automatically after every save.
 *
 * Only verified pool moments can be priced — no invented stops.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { COMPOSABLE_STOPS_QUERY_KEY, useComposableStops } from "@/hooks/use-composable-stops";
import type { ComposablePricingUnit } from "@/lib/studio-v3/composableStopAuthority";

const UNITS: ReadonlyArray<{ value: ComposablePricingUnit; label: string }> = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "per_vehicle", label: "Per vehicle" },
  { value: "fixed", label: "Flat fee" },
];

type Draft = {
  stopId: string;
  price: string;
  unit: ComposablePricingUnit;
  minGuests: string;
  active: boolean;
};

export const Route = createFileRoute("/admin/pricing-tool")({
  head: () => ({
    meta: [
      { title: "Pricing tool — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PricingToolPage,
  errorComponent: PricingToolError,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

function PricingToolError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Pricing tool failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-4 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    </SiteLayout>
  );
}

function PricingToolPage() {
  const queryClient = useQueryClient();
  const { data: rows } = useComposableStops();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);

  const stops = useMemo(
    () => REGION_STOP_POOL.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return stops
      .filter(
        (s) =>
          !drafts.some((d) => d.stopId === s.id) &&
          (s.name.toLowerCase().includes(needle) ||
            s.id.toLowerCase().includes(needle) ||
            s.region.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [stops, query, drafts]);

  const addStop = (stopId: string) => {
    const existing = rows?.find((r) => r.stopId === stopId);
    setDrafts((prev) => [
      ...prev,
      {
        stopId,
        price: existing && existing.priceCents > 0 ? (existing.priceCents / 100).toFixed(2) : "",
        unit: existing?.pricingUnit ?? "per_person",
        minGuests: String(existing?.minGuests ?? 1),
        active: existing?.active ?? true,
      },
    ]);
    setQuery("");
  };

  const patch = (stopId: string, next: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.stopId === stopId ? { ...d, ...next } : d)));

  const saveAll = async () => {
    if (drafts.length === 0) return;
    const payload = [];
    for (const draft of drafts) {
      const stop = stops.find((s) => s.id === draft.stopId);
      if (!stop) continue;
      const euros = Number(draft.price.replace(",", "."));
      const priced = Number.isFinite(euros) && euros > 0;
      if (draft.active && !priced) {
        toast.error(`${stop.name}: enter a price above €0 before activating.`);
        return;
      }
      payload.push({
        stop_id: stop.id,
        region: stop.region,
        price_cents: priced ? Math.round(euros * 100) : 0,
        pricing_unit: draft.unit,
        min_guests: Math.max(1, Number.parseInt(draft.minGuests, 10) || 1),
        active: draft.active,
      });
    }
    setSaving(true);
    const { error } = await supabase
      .from("studio_composable_stops")
      .upsert(payload, { onConflict: "stop_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: COMPOSABLE_STOPS_QUERY_KEY });
    toast.success(`${payload.length} moment(s) priced — price map updated.`);
    setDrafts([]);
  };

  return (
    <SiteLayout>
      <section className="pt-32 pb-24">
        <div className="container-x max-w-3xl">
          <Link
            to="/admin"
            className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]"
          >
            ← Admin
          </Link>
          <h1 className="mt-4 text-3xl">Pricing tool</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Search a moment by name, set its price, billing unit and minimum guests. Saving updates{" "}
            <Link to="/admin/price-map" className="underline">
              the price map
            </Link>{" "}
            and the Studio immediately.
          </p>

          <label className="mt-8 block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Stop name
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. cheese, boat, market"
              className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
            />
          </label>

          {matches.length > 0 ? (
            <ul className="mt-2 border border-[color:var(--border)]">
              {matches.map((stop) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => addStop(stop.id)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-[color:var(--sand)]"
                  >
                    <span>{stop.name}</span>
                    <span className="inline-flex items-center gap-2 text-xs text-[color:var(--charcoal-soft)]">
                      {stop.region} <Plus size={14} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {drafts.length === 0 ? (
            <p className="mt-10 text-sm text-[color:var(--charcoal-soft)]">
              No moments queued yet.
            </p>
          ) : (
            <ul className="mt-8 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {drafts.map((draft) => {
                const stop = stops.find((s) => s.id === draft.stopId);
                if (!stop) return null;
                return (
                  <li key={draft.stopId} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base">{stop.name}</h2>
                        <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                          {stop.region} · {stop.durationMin} min · <code>{stop.id}</code>
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${stop.name}`}
                        onClick={() =>
                          setDrafts((prev) => prev.filter((d) => d.stopId !== draft.stopId))
                        }
                        className="inline-flex h-11 w-11 items-center justify-center border border-[color:var(--border)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Price (€)
                        <input
                          inputMode="decimal"
                          value={draft.price}
                          onChange={(e) => patch(draft.stopId, { price: e.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Billed
                        <select
                          value={draft.unit}
                          onChange={(e) =>
                            patch(draft.stopId, {
                              unit: e.target.value as ComposablePricingUnit,
                            })
                          }
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        >
                          {UNITS.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {unit.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Min guests
                        <input
                          inputMode="numeric"
                          value={draft.minGuests}
                          onChange={(e) => patch(draft.stopId, { minGuests: e.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="inline-flex min-h-[44px] items-center gap-2 self-end text-sm">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(e) => patch(draft.stopId, { active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        Active
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 z-20 border-t border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur">
        <div className="container-x flex max-w-3xl flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-[color:var(--charcoal-soft)]">
            {drafts.length === 0 ? "Nothing queued" : `${drafts.length} moment(s) queued`}
          </p>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || drafts.length === 0}
            className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-5 text-sm hover:border-[color:var(--gold)] disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save prices"}
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}
