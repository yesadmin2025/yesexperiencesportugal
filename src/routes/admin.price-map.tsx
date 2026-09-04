// Bulk PRICE MAP for composable moments.
//
// Same source of truth as /admin/composable-stops (`studio_composable_stops`),
// but laid out as one dense table so every stop can be priced in a single pass
// and saved together. A moment is only composable in the Studio when it is
// active AND priced above €0.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Save, Search } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import {
  COMPOSABLE_STOPS_QUERY_KEY,
  useComposableStops,
} from "@/hooks/use-composable-stops";
import type { ComposablePricingUnit } from "@/lib/studio-v3/composableStopAuthority";

const UNITS: ReadonlyArray<{ value: ComposablePricingUnit; label: string }> = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "per_vehicle", label: "Per vehicle" },
  { value: "fixed", label: "Flat fee" },
];

type RowForm = {
  price: string;
  unit: ComposablePricingUnit;
  minGuests: string;
  active: boolean;
};

const emptyForm: RowForm = { price: "", unit: "per_person", minGuests: "1", active: false };

function serialize(form: RowForm): string {
  return `${form.price.trim()}|${form.unit}|${form.minGuests.trim()}|${form.active}`;
}

function PriceMapError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20">
        <div className="container-x max-w-2xl">
          <h1 className="text-2xl">Price map failed</h1>
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
        </div>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/admin/price-map")({
  head: () => ({
    meta: [
      { title: "Price map — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PriceMapPage,
  errorComponent: PriceMapError,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

function PriceMapPage() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading, refetch } = useComposableStops();
  const [forms, setForms] = useState<Record<string, RowForm>>({});
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  const stops = useMemo(
    () =>
      REGION_STOP_POOL.filter((stop) => stop.active).sort((a, b) =>
        a.region === b.region ? a.name.localeCompare(b.name) : a.region.localeCompare(b.region),
      ),
    [],
  );

  const regions = useMemo(() => [...new Set(stops.map((s) => s.region))].sort(), [stops]);

  useEffect(() => {
    if (!rows) return;
    const next: Record<string, RowForm> = {};
    const base: Record<string, string> = {};
    for (const stop of stops) {
      const row = rows.find((candidate) => candidate.stopId === stop.id);
      const form: RowForm = row
        ? {
            price: row.priceCents > 0 ? (row.priceCents / 100).toFixed(2) : "",
            unit: row.pricingUnit,
            minGuests: String(row.minGuests),
            active: row.active,
          }
        : { ...emptyForm };
      next[stop.id] = form;
      base[stop.id] = serialize(form);
    }
    setForms(next);
    setBaseline(base);
  }, [rows, stops]);

  const formFor = (stopId: string): RowForm => forms[stopId] ?? emptyForm;

  const patch = (stopId: string, next: Partial<RowForm>) =>
    setForms((prev) => ({ ...prev, [stopId]: { ...(prev[stopId] ?? emptyForm), ...next } }));

  const changedIds = useMemo(
    () => Object.keys(forms).filter((id) => serialize(formFor(id)) !== (baseline[id] ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forms, baseline],
  );

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return stops.filter((stop) => {
      if (regionFilter !== "all" && stop.region !== regionFilter) return false;
      if (!needle) return true;
      return (
        stop.name.toLowerCase().includes(needle) ||
        stop.id.toLowerCase().includes(needle) ||
        stop.region.toLowerCase().includes(needle) ||
        stop.type.toLowerCase().includes(needle)
      );
    });
  }, [stops, filter, regionFilter]);

  const saveAll = async () => {
    if (changedIds.length === 0) return;
    const payload: Array<Record<string, unknown>> = [];
    for (const id of changedIds) {
      const stop = stops.find((candidate) => candidate.id === id);
      if (!stop) continue;
      const form = formFor(id);
      const euros = Number(form.price.replace(",", "."));
      const priced = Number.isFinite(euros) && euros > 0;
      if (form.active && !priced) {
        toast.error(`${stop.name}: enter a price above €0 before activating.`);
        return;
      }
      payload.push({
        stop_id: stop.id,
        region: stop.region,
        price_cents: priced ? Math.round(euros * 100) : 0,
        pricing_unit: form.unit,
        min_guests: Math.max(1, Number.parseInt(form.minGuests, 10) || 1),
        active: form.active,
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
    toast.success(`${payload.length} moment${payload.length === 1 ? "" : "s"} saved`);
    await queryClient.invalidateQueries({ queryKey: COMPOSABLE_STOPS_QUERY_KEY });
  };

  const pricedCount = Object.values(forms).filter(
    (form) => form.active && Number(form.price.replace(",", ".")) > 0,
  ).length;

  return (
    <SiteLayout>
      <section className="pt-28 pb-32">
        <div className="container-x max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            Studio
          </p>
          <h1 className="mt-2 text-3xl">Price map</h1>
          <p className="prose-longform mt-4 text-sm text-[color:var(--charcoal-soft)]">
            Every verified moment in one table: price, how it is billed and the minimum party it
            needs. Set them all, then save once. Unpriced moments stay invisible in the Studio.
          </p>
          <p className="mt-3 text-sm">
            <strong className="font-medium">{pricedCount}</strong> priced and active ·{" "}
            {stops.length} moments ·{" "}
            <Link to="/admin/composable-stops" className="underline">
              detailed editor
            </Link>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="flex min-h-[44px] flex-1 items-center gap-2 border border-[color:var(--border)] px-3">
              <Search size={14} aria-hidden />
              <span className="sr-only">Search moments</span>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search by name, id, region or type"
                className="w-full bg-transparent py-2 text-base outline-none md:text-sm"
              />
            </label>
            <label className="flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-3">
              <span className="sr-only">Filter by region</span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="bg-transparent py-2 text-base outline-none md:text-sm"
              >
                <option value="all">All regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-4 text-sm hover:border-[color:var(--gold)]"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-10 text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
          ) : (
            <ul className="mt-8 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {visible.map((stop: OptionalStop) => {
                const form = formFor(stop.id);
                const priced = Number(form.price.replace(",", ".")) > 0;
                return (
                  <li key={stop.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base">{stop.name}</h2>
                      <span
                        className={`text-[11px] uppercase tracking-[0.22em] ${
                          priced && form.active
                            ? "text-[color:var(--teal)]"
                            : "text-[color:var(--charcoal-soft)]"
                        }`}
                      >
                        {priced && form.active ? "Composable" : "Needs price"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                      {stop.region} · {stop.type} · {stop.durationMin} min · <code>{stop.id}</code>
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Price (€)
                        <input
                          inputMode="decimal"
                          value={form.price}
                          onChange={(event) => patch(stop.id, { price: event.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Billed
                        <select
                          value={form.unit}
                          onChange={(event) =>
                            patch(stop.id, { unit: event.target.value as ComposablePricingUnit })
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
                          value={form.minGuests}
                          onChange={(event) => patch(stop.id, { minGuests: event.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="inline-flex min-h-[44px] items-center gap-2 self-end text-sm">
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(event) => patch(stop.id, { active: event.target.checked })}
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
        <div className="container-x flex max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-[color:var(--charcoal-soft)]">
            {changedIds.length === 0
              ? "No unsaved changes"
              : `${changedIds.length} moment${changedIds.length === 1 ? "" : "s"} changed`}
          </p>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || changedIds.length === 0}
            className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-5 text-sm hover:border-[color:var(--gold)] disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}
