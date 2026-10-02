// Admin Price Map — "Tailor changes" mode.
//
// Lists EVERY change a traveler can structurally make to each Signature
// (from the Tailor blueprints) next to its owner-set price rule in
// `tailor_price_rules`. Customer Tailor only offers rows that are active and
// priced; here every row is visible, with "Missing price" flagged.

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findTour } from "@/data/signatureTours";
import { allTailorOfferedActions, type TailorOfferedAction } from "@/lib/tailor/tailor-price-catalog";
import {
  fetchTailorPriceMap,
  TAILOR_PRICE_MAP_QUERY_KEY,
} from "@/hooks/use-tailor-price-map";
import type { TailorAdjustmentType, TailorPriceRule, TailorUnit } from "@/lib/tailor/tailor-price-engine";

type Form = {
  type: TailorAdjustmentType;
  value: string;
  unit: TailorUnit;
  active: boolean;
  minParty: string;
  maxParty: string;
  note: string;
};

const UNITS: ReadonlyArray<{ value: TailorUnit; label: string }> = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "per_vehicle", label: "Per vehicle" },
  { value: "flat", label: "Flat" },
];

const keyOf = (a: { tourId: string; actionId: string; direction: string }) =>
  `${a.tourId}|${a.actionId}|${a.direction}`;

const serialize = (f: Form) =>
  [f.type, f.value.trim(), f.unit, f.active, f.minParty.trim(), f.maxParty.trim(), f.note.trim()].join("|");

function formFromRule(rule: TailorPriceRule | undefined): Form {
  return {
    type: rule?.adjustment_type ?? "fixed_eur",
    value: rule?.adjustment_value == null ? "" : String(rule.adjustment_value),
    unit: rule?.unit ?? "per_person",
    active: rule?.active ?? true,
    minParty: rule?.min_party == null ? "" : String(rule.min_party),
    maxParty: rule?.max_party == null ? "" : String(rule.max_party),
    note: (rule as { note?: string | null } | undefined)?.note ?? "",
  };
}

export type TailorRowStatus = "priced" | "missing" | "inactive";

/** Completeness counts only directions the Signature actually offers. */
export function tailorRowStatus(form: Pick<Form, "value" | "active">): TailorRowStatus {
  if (!form.active) return "inactive";
  return form.value.trim() === "" ? "missing" : "priced";
}

export function TailorPriceMap() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [...TAILOR_PRICE_MAP_QUERY_KEY, "admin"],
    queryFn: () => fetchTailorPriceMap(),
  });
  const offered = useMemo(() => allTailorOfferedActions(), []);
  const tours = useMemo(() => [...new Set(offered.map((a) => a.tourId))], [offered]);
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [forms, setForms] = useState<Record<string, Form>>({});
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const byKey = new Map(data.rules.map((r) => [`${r.tour_id}|${r.action_id}|${r.direction}`, r]));
    const next: Record<string, Form> = {};
    const base: Record<string, string> = {};
    for (const a of offered) {
      const f = formFromRule(byKey.get(keyOf(a)));
      next[keyOf(a)] = f;
      base[keyOf(a)] = serialize(f);
    }
    setForms(next);
    setBaseline(base);
  }, [data, offered]);

  const formFor = (a: TailorOfferedAction) => forms[keyOf(a)] ?? formFromRule(undefined);
  const patch = (a: TailorOfferedAction, p: Partial<Form>) =>
    setForms((prev) => ({ ...prev, [keyOf(a)]: { ...formFor(a), ...p } }));

  const summary = useMemo(() => {
    return tours.map((tourId) => {
      const rows = offered.filter((a) => a.tourId === tourId);
      const missing = rows.filter((a) => tailorRowStatus(formFor(a)) === "missing").length;
      return { tourId, total: rows.length, missing };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, offered, forms]);
  const totalMissing = summary.reduce((s, t) => s + t.missing, 0);

  const visible = offered.filter(
    (a) =>
      (tourFilter === "all" || a.tourId === tourFilter) &&
      (!onlyMissing || tailorRowStatus(formFor(a)) === "missing"),
  );
  const changed = offered.filter((a) => serialize(formFor(a)) !== (baseline[keyOf(a)] ?? ""));

  const saveAll = async () => {
    if (changed.length === 0) return;
    const payload = [];
    for (const a of changed) {
      const f = formFor(a);
      const raw = f.value.trim().replace(",", ".");
      const value = raw === "" ? null : Number(raw);
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        toast.error(`${a.label}: enter 0 or a positive amount (direction already says add or remove).`);
        return;
      }
      if (f.type === "percent" && value !== null && value > 100) {
        toast.error(`${a.label}: a percentage must be between 0 and 100.`);
        return;
      }
      const minP = f.minParty.trim() ? Number.parseInt(f.minParty, 10) : null;
      const maxP = f.maxParty.trim() ? Number.parseInt(f.maxParty, 10) : null;
      payload.push({
        tour_id: a.tourId,
        action_id: a.actionId,
        action_kind: a.kind,
        direction: a.direction,
        label: a.label,
        default_in_day: a.defaultInDay,
        adjustment_type: f.type,
        adjustment_value: value,
        unit: f.unit,
        policy_group: f.type === "percent" && a.kind === "stop" && a.direction === "remove" ? "principal_removal" : null,
        active: f.active,
        min_party: minP && minP > 0 ? minP : null,
        max_party: maxP && maxP > 0 ? maxP : null,
        note: f.note.trim() || null,
      });
    }
    setSaving(true);
    const db = supabase as unknown as {
      from: (t: string) => { upsert: (p: unknown, o: unknown) => Promise<{ error: Error | null }> };
    };
    const { error } = await db
      .from("tailor_price_rules")
      .upsert(payload, { onConflict: "tour_id,action_id,direction" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${payload.length} Tailor price${payload.length === 1 ? "" : "s"} saved`);
    await queryClient.invalidateQueries({ queryKey: TAILOR_PRICE_MAP_QUERY_KEY });
  };

  const tourTitle = (id: string) => findTour(id)?.title.split("—")[0].trim() ?? id;

  return (
    <div data-testid="tailor-price-map">
      <p className="prose-longform mt-4 text-sm text-[color:var(--charcoal-soft)]">
        Every change a traveler can make in Tailor. A change is offered online only when it is
        active and has a price. Enter <strong className="font-medium">0</strong> for “no price
        change”. Leave empty while you decide — it stays hidden from travelers.
      </p>

      <div
        data-testid="tailor-completeness"
        className={[
          "mt-4 border px-4 py-3 text-sm",
          totalMissing === 0
            ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5"
            : "border-red-300 bg-red-50",
        ].join(" ")}
      >
        {totalMissing === 0
          ? "Tailor pricing complete for every Signature."
          : `Tailor pricing incomplete · ${totalMissing} missing price${totalMissing === 1 ? "" : "s"}`}
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {summary.map((t) => (
            <li key={t.tourId}>
              <button
                type="button"
                onClick={() => setTourFilter(t.tourId)}
                className="text-left underline-offset-2 hover:underline"
              >
                {tourTitle(t.tourId)} —{" "}
                {t.missing === 0 ? (
                  <span className="text-[color:var(--teal)]">Complete</span>
                ) : (
                  <span className="text-red-700">Incomplete ({t.missing} missing)</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">Filter by Signature</span>
          <select
            value={tourFilter}
            onChange={(e) => setTourFilter(e.target.value)}
            className="min-h-[44px] border border-[color:var(--border)] bg-transparent px-3 text-sm"
          >
            <option value="all">All Signatures</option>
            {tours.map((t) => (
              <option key={t} value={t}>
                {tourTitle(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Only missing prices
        </label>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">Loading Tailor prices…</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                <th className="py-2 pr-3">Change</th>
                <th className="py-2 pr-3">In the day by default</th>
                <th className="py-2 pr-3">Direction</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const f = formFor(a);
                const status = tailorRowStatus(f);
                return (
                  <tr key={keyOf(a)} data-testid="tailor-price-row" className="border-b border-[color:var(--border)] align-top">
                    <td className="py-2 pr-3">
                      <span className="block">{a.label}</span>
                      <span className="block text-[11.5px] text-[color:var(--charcoal-soft)]">
                        {tourTitle(a.tourId)} · <code>{a.actionId}</code>
                      </span>
                    </td>
                    <td className="py-2 pr-3">{a.defaultInDay ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">{a.direction === "remove" ? "Remove (−)" : "Add (+)"}</td>
                    <td className="py-2 pr-3">
                      <select
                        aria-label={`${a.label} type`}
                        value={f.type}
                        onChange={(e) => patch(a, { type: e.target.value as TailorAdjustmentType })}
                        className="min-h-[40px] border border-[color:var(--border)] bg-transparent px-2"
                      >
                        <option value="fixed_eur">€</option>
                        <option value="percent">%</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        aria-label={`${a.label} value`}
                        inputMode="decimal"
                        value={f.value}
                        placeholder="—"
                        onChange={(e) => patch(a, { value: e.target.value })}
                        className="min-h-[40px] w-24 border border-[color:var(--border)] bg-transparent px-2"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        aria-label={`${a.label} unit`}
                        value={f.unit}
                        disabled={f.type === "percent"}
                        onChange={(e) => patch(a, { unit: e.target.value as TailorUnit })}
                        className="min-h-[40px] border border-[color:var(--border)] bg-transparent px-2 disabled:opacity-50"
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        aria-label={`${a.label} active`}
                        checked={f.active}
                        onChange={(e) => patch(a, { active: e.target.checked })}
                        className="h-5 w-5"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      {status === "missing" ? (
                        <span className="font-medium text-red-700">Missing price</span>
                      ) : status === "inactive" ? (
                        <span className="text-[color:var(--charcoal-soft)]">Inactive</span>
                      ) : (
                        <span className="text-[color:var(--teal)]">Priced</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--ivory)] py-3">
        <span className="text-sm text-[color:var(--charcoal-soft)]">
          {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || changed.length === 0}
          className="inline-flex min-h-[44px] items-center gap-2 bg-[color:var(--teal)] px-5 text-sm text-[color:var(--ivory)] disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save all"}
        </button>
      </div>
    </div>
  );
}
