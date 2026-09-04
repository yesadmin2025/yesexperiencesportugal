// Admin editor for COMPOSABLE MOMENTS.
//
// Source of truth: the `studio_composable_stops` table. Each row gives one
// real inventory stop an owner-set price, which is what allows the Studio to
// compose that stop into a bespoke day anywhere in the region — not only
// inside the Signature it originally belongs to, and not as a trailing add-on.
//
// A stop is composable ONLY when it is active AND priced. Everything else
// shows "Needs price" and stays invisible to guests.

import { createFileRoute, useRouter } from "@tanstack/react-router";
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
  notes: string;
};

const emptyForm: RowForm = {
  price: "",
  unit: "per_person",
  minGuests: "1",
  active: false,
  notes: "",
};

function AdminComposableStopsError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20">
        <div className="container-x max-w-2xl">
          <h1 className="text-2xl">Composable moments editor failed</h1>
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

export const Route = createFileRoute("/admin/composable-stops")({
  head: () => ({
    meta: [
      { title: "Composable moments — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminComposableStopsPage,
  errorComponent: AdminComposableStopsError,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

function sourceTourOf(stop: OptionalStop): string {
  return stop.signatureTourId ?? stop.sourceTourIds?.[0] ?? "—";
}

function AdminComposableStopsPage() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading, refetch } = useComposableStops();
  const [forms, setForms] = useState<Record<string, RowForm>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const stops = useMemo(
    () =>
      REGION_STOP_POOL.filter((stop) => stop.active).sort((a, b) =>
        a.region === b.region ? a.name.localeCompare(b.name) : a.region.localeCompare(b.region),
      ),
    [],
  );

  const regions = useMemo(
    () => [...new Set(stops.map((stop) => stop.region))].sort(),
    [stops],
  );

  useEffect(() => {
    if (!rows) return;
    const next: Record<string, RowForm> = {};
    for (const row of rows) {
      next[row.stopId] = {
        price: row.priceCents > 0 ? (row.priceCents / 100).toFixed(2) : "",
        unit: row.pricingUnit,
        minGuests: String(row.minGuests),
        active: row.active,
        notes: row.notes ?? "",
      };
    }
    setForms(next);
  }, [rows]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return stops.filter((stop) => {
      if (regionFilter !== "all" && stop.region !== regionFilter) return false;
      if (!needle) return true;
      return (
        stop.name.toLowerCase().includes(needle) ||
        stop.id.toLowerCase().includes(needle) ||
        stop.type.toLowerCase().includes(needle)
      );
    });
  }, [stops, filter, regionFilter]);

  const formFor = (stopId: string): RowForm => forms[stopId] ?? emptyForm;

  const patch = (stopId: string, next: Partial<RowForm>) => {
    setForms((prev) => ({ ...prev, [stopId]: { ...formFor(stopId), ...next } }));
  };

  const save = async (stop: OptionalStop) => {
    const form = formFor(stop.id);
    const euros = Number(form.price.replace(",", "."));
    if (form.active && (!Number.isFinite(euros) || euros <= 0)) {
      toast.error("Enter a price above €0 before activating this moment.");
      return;
    }
    const minGuests = Math.max(1, Number.parseInt(form.minGuests, 10) || 1);
    setSaving(stop.id);
    const { error } = await supabase.from("studio_composable_stops").upsert(
      {
        stop_id: stop.id,
        region: stop.region,
        price_cents: Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : 0,
        pricing_unit: form.unit,
        min_guests: minGuests,
        active: form.active,
        notes: form.notes.trim() || null,
      },
      { onConflict: "stop_id" },
    );
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${stop.name} saved`);
    await queryClient.invalidateQueries({ queryKey: COMPOSABLE_STOPS_QUERY_KEY });
  };

  const pricedCount = Object.values(forms).filter(
    (form) => form.active && Number(form.price) > 0,
  ).length;

  return (
    <SiteLayout>
      <section className="pt-28 pb-20">
        <div className="container-x max-w-5xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            Studio
          </p>
          <h1 className="mt-2 text-3xl">Composable moments</h1>
          <p className="prose-longform mt-4 text-sm text-[color:var(--charcoal-soft)]">
            Any moment priced and activated here can be composed into a client-designed day
            anywhere in its region — at its natural place in the day, not appended at the end.
            A moment with no price stays invisible to guests.
          </p>
          <p className="mt-3 text-sm">
            <strong className="font-medium">{pricedCount}</strong> priced and active ·{" "}
            {stops.length} moments in the verified pool
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="flex min-h-[44px] flex-1 items-center gap-2 border border-[color:var(--border)] px-3">
              <Search size={14} aria-hidden />
              <span className="sr-only">Search moments</span>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search by name, id or type"
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
            <ul className="mt-8 space-y-4">
              {visible.map((stop) => {
                const form = formFor(stop.id);
                const priced = Number(form.price) > 0;
                return (
                  <li
                    key={stop.id}
                    className="border border-[color:var(--border)] bg-[color:var(--sand)]/40 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-lg">{stop.name}</h2>
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
                      {stop.region} · {stop.type} · {stop.durationMin} min · from{" "}
                      {sourceTourOf(stop)} · <code>{stop.id}</code>
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Price (€)
                        <input
                          inputMode="decimal"
                          value={form.price}
                          onChange={(event) => patch(stop.id, { price: event.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
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
                      <label className="block text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Min guests
                        <input
                          inputMode="numeric"
                          value={form.minGuests}
                          onChange={(event) => patch(stop.id, { minGuests: event.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        Internal note
                        <input
                          value={form.notes}
                          onChange={(event) => patch(stop.id, { notes: event.target.value })}
                          className="mt-1 min-h-[44px] w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-base normal-case tracking-normal outline-none focus:border-[color:var(--gold)] md:text-sm"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <label className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(event) => patch(stop.id, { active: event.target.checked })}
                          className="h-4 w-4"
                        />
                        Active in Studio
                      </label>
                      <button
                        type="button"
                        onClick={() => void save(stop)}
                        disabled={saving === stop.id}
                        className="inline-flex min-h-[44px] items-center gap-2 border border-[color:var(--border)] px-4 text-sm hover:border-[color:var(--gold)] disabled:opacity-50"
                      >
                        <Save size={14} /> {saving === stop.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
