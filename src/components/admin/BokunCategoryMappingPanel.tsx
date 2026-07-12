// Admin: Bókun category mapping + banded-pricing rollout.
//
// Reads the mirror row from `tour_price_tiers` (bokun_categories,
// banded_pricing_enabled) written by `sync-bokun-pricing`, and lets an admin:
//   • assign each Bókun pricingCategory to a UI band (adult/youth/child/infant/other)
//   • toggle `confirmed` per category (only confirmed categories drive the picker)
//   • toggle `countsTowardCapacity` and `normallyFree`
//   • flip the per-tour `banded_pricing_enabled` rollout flag
//
// Writes go directly to `tour_price_tiers` under RLS. Nothing here bypasses
// the sync — sync will preserve `mappingStatus: "confirmed"` on subsequent
// runs (see `mergeCategoryMappings`).

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import type {
  MappedBokunPricingCategory,
  MappingStatus,
} from "@/lib/pricing/bokunCategories";
import type { AgeBand } from "@/lib/pricing/ageBandPricing";
import { TOUR_BOKUN_READINESS_KEY } from "@/hooks/use-tour-bokun-readiness";

type Row = {
  tour_id: string;
  bokun_categories: MappedBokunPricingCategory[] | null;
  banded_pricing_enabled: boolean;
  pricing_mode: string | null;
  synced_from_bokun_at: string | null;
};

const UI_BANDS: Array<AgeBand | "other"> = ["adult", "youth", "child", "infant", "other"];
const STATUSES: MappingStatus[] = ["confirmed", "suggested", "unmapped"];

export function BokunCategoryMappingPanel({ tours = signatureTours }: { tours?: SignatureTour[] }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin.bokun_category_mapping"],
    queryFn: async (): Promise<Record<string, Row>> => {
      const { data, error } = await supabase
        .from("tour_price_tiers")
        .select(
          "tour_id, bokun_categories, banded_pricing_enabled, pricing_mode, synced_from_bokun_at",
        );
      if (error) throw error;
      const out: Record<string, Row> = {};
      for (const r of data ?? []) {
        out[r.tour_id] = {
          tour_id: r.tour_id,
          bokun_categories:
            (r.bokun_categories as MappedBokunPricingCategory[] | null) ?? null,
          banded_pricing_enabled: !!r.banded_pricing_enabled,
          pricing_mode: r.pricing_mode as string | null,
          synced_from_bokun_at: r.synced_from_bokun_at as string | null,
        };
      }
      return out;
    },
    staleTime: 30_000,
  });

  const rowsByTour = data ?? {};
  const tourOptions = useMemo(
    () => tours.filter((t) => rowsByTour[t.id]?.bokun_categories?.length),
    [tours, rowsByTour],
  );
  const [openTourId, setOpenTourId] = useState<string | null>(null);

  async function persist(tourId: string, patch: Partial<Row>) {
    const { error } = await supabase
      .from("tour_price_tiers")
      .update({
        ...(patch.bokun_categories !== undefined
          ? { bokun_categories: patch.bokun_categories as unknown as import("@/integrations/supabase/types").Json }
          : {}),
        ...(patch.banded_pricing_enabled !== undefined
          ? { banded_pricing_enabled: patch.banded_pricing_enabled }
          : {}),
      })
      .eq("tour_id", tourId);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return false;
    }
    await refetch();
    await qc.invalidateQueries({ queryKey: TOUR_BOKUN_READINESS_KEY });
    return true;
  }

  return (
    <section className="mt-8 border border-[color:var(--border)] bg-white p-5">
      <header>
        <h2 className="text-lg font-semibold">Bókun category mapping · rollout</h2>
        <p className="mt-1 text-xs text-[color:var(--charcoal-soft)] max-w-2xl">
          Confirm the UI band for each Bókun pricingCategory before enabling banded pricing.
          Only <strong>confirmed</strong> categories drive the guest picker on the site.
          Sync from Bókun preserves any confirmation you save here.
        </p>
      </header>

      {isLoading ? (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-[color:var(--charcoal-soft)]">
          <Loader2 size={14} className="animate-spin" /> Loading mirror…
        </p>
      ) : tourOptions.length === 0 ? (
        <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
          No synced categories yet. Run <strong>Sync from Bókun</strong> above first.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[color:var(--border)] border border-[color:var(--border)]">
          {tourOptions.map((t) => {
            const row = rowsByTour[t.id];
            const cats = row.bokun_categories ?? [];
            const confirmed = cats.filter((c) => c.mappingStatus === "confirmed").length;
            const isOpen = openTourId === t.id;
            const ready = confirmed > 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setOpenTourId(isOpen ? null : t.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[color:var(--sand)]/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{t.title}</div>
                    <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                      {cats.length} categor{cats.length === 1 ? "y" : "ies"} ·{" "}
                      {confirmed} confirmed
                      {row.pricing_mode ? ` · mode ${row.pricing_mode}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "text-[10px] uppercase tracking-[0.18em] border px-2 py-0.5",
                        row.banded_pricing_enabled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-[color:var(--border)] bg-white text-[color:var(--charcoal-soft)]",
                      ].join(" ")}
                    >
                      {row.banded_pricing_enabled ? "Live" : "Off"}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                      {isOpen ? "Hide" : "Edit"}
                    </span>
                  </div>
                </button>
                {isOpen ? (
                  <TourMappingEditor
                    row={row}
                    ready={ready}
                    onSaveCategories={(cats) =>
                      persist(t.id, { bokun_categories: cats })
                    }
                    onToggleRollout={(enabled) =>
                      persist(t.id, { banded_pricing_enabled: enabled })
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TourMappingEditor({
  row,
  ready,
  onSaveCategories,
  onToggleRollout,
}: {
  row: Row;
  ready: boolean;
  onSaveCategories: (cats: MappedBokunPricingCategory[]) => Promise<boolean>;
  onToggleRollout: (enabled: boolean) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<MappedBokunPricingCategory[]>(
    row.bokun_categories ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row.bokun_categories ?? []);

  function patch(id: string, next: Partial<MappedBokunPricingCategory>) {
    setDraft((prev) =>
      prev.map((c) => (c.bokunCategoryId === id ? { ...c, ...next } : c)),
    );
  }

  async function save() {
    setSaving(true);
    try {
      const ok = await onSaveCategories(draft);
      if (ok) toast.success("Category mapping saved");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(enabled: boolean) {
    setTogglePending(true);
    try {
      const ok = await onToggleRollout(enabled);
      if (ok) {
        toast.success(enabled ? "Banded pricing enabled" : "Banded pricing disabled");
      }
    } finally {
      setTogglePending(false);
    }
  }

  return (
    <div className="px-3 pb-4 bg-[color:var(--sand)]/30 border-t border-[color:var(--border)]">
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              <th className="text-left font-normal py-1 pr-2">ID</th>
              <th className="text-left font-normal py-1 pr-2">Title</th>
              <th className="text-left font-normal py-1 pr-2">Ages</th>
              <th className="text-left font-normal py-1 pr-2">UI band</th>
              <th className="text-left font-normal py-1 pr-2">Status</th>
              <th className="text-left font-normal py-1 pr-2">Capacity</th>
              <th className="text-left font-normal py-1 pr-2">Free</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((c) => (
              <tr key={c.bokunCategoryId} className="border-t border-[color:var(--border)]">
                <td className="py-1 pr-2 tabular-nums">#{c.bokunCategoryId}</td>
                <td className="py-1 pr-2">{c.bokunTitle}</td>
                <td className="py-1 pr-2 text-[color:var(--charcoal-soft)]">
                  {c.minAge ?? "–"}
                  {c.maxAge != null ? `–${c.maxAge}` : c.minAge != null ? "+" : ""}
                </td>
                <td className="py-1 pr-2">
                  <select
                    value={c.uiBand}
                    onChange={(e) =>
                      patch(c.bokunCategoryId, {
                        uiBand: e.target.value as AgeBand | "other",
                      })
                    }
                    className="border border-[color:var(--border)] bg-white px-1.5 py-1"
                  >
                    {UI_BANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <select
                    value={c.mappingStatus}
                    onChange={(e) =>
                      patch(c.bokunCategoryId, {
                        mappingStatus: e.target.value as MappingStatus,
                      })
                    }
                    className="border border-[color:var(--border)] bg-white px-1.5 py-1"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="checkbox"
                    checked={c.countsTowardCapacity}
                    onChange={(e) =>
                      patch(c.bokunCategoryId, { countsTowardCapacity: e.target.checked })
                    }
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="checkbox"
                    checked={c.normallyFree}
                    onChange={(e) =>
                      patch(c.bokunCategoryId, { normallyFree: e.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 border border-[color:var(--charcoal)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] hover:bg-[color:var(--charcoal)] hover:text-[color:var(--ivory)] disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save mapping
          </button>
          <button
            type="button"
            onClick={() => setDraft(row.bokun_categories ?? [])}
            disabled={!dirty || saving}
            className="text-[11px] text-[color:var(--charcoal-soft)] underline disabled:opacity-40"
          >
            Discard
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={row.banded_pricing_enabled}
            disabled={togglePending || (!row.banded_pricing_enabled && !ready)}
            onChange={(e) => toggle(e.target.checked)}
          />
          <span>
            <strong>banded_pricing_enabled</strong>
            {!ready ? (
              <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-amber-800">
                confirm at least one category first
              </span>
            ) : (
              <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-emerald-800 inline-flex items-center gap-1">
                <Check size={10} /> ready
              </span>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}
