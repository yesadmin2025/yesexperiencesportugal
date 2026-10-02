import { describe, expect, it } from "vitest";
import {
  computeTailorPrice,
  tailorRuleBookable,
  type TailorPricePolicy,
  type TailorPriceRule,
} from "../tailor-price-engine";
import { allTailorOfferedActions, tailorOfferedActions } from "../tailor-price-catalog";
import { tailorRowStatus } from "@/components/admin/TailorPriceMap";
import { ageBand } from "@/data/signatureTourPricing";
import { readFileSync } from "node:fs";

const rule = (
  p: Partial<TailorPriceRule> & Pick<TailorPriceRule, "action_id" | "direction">,
): TailorPriceRule =>
  ({
    tour_id: "arrabida-wine-allinclusive",
    action_kind: "stop",
    adjustment_type: "fixed_eur",
    adjustment_value: 0,
    unit: "per_person",
    policy_group: null,
    active: true,
    min_party: null,
    max_party: null,
    label: p.action_id,
    ...p,
  }) as TailorPriceRule;

const policies: TailorPricePolicy[] = [
  { policy_group: "principal_removal", max_total_pct: 0.15, floor_pct_of_base: 0.7 },
];

const rules: TailorPriceRule[] = [
  rule({
    action_id: "choice-3",
    direction: "add",
    action_kind: "choice_slot",
    adjustment_value: 20,
  }),
  rule({
    action_id: "choice-4",
    direction: "add",
    action_kind: "choice_slot",
    adjustment_value: 20,
  }),
  rule({
    action_id: "choice-2",
    direction: "remove",
    action_kind: "choice_slot",
    adjustment_value: 10,
  }),
  rule({
    action_id: "choice-1",
    direction: "remove",
    action_kind: "choice_slot",
    adjustment_value: 10,
  }),
  rule({
    action_id: "stop:a",
    direction: "remove",
    adjustment_type: "percent",
    adjustment_value: 5,
    policy_group: "principal_removal",
  }),
  rule({
    action_id: "stop:b",
    direction: "remove",
    adjustment_type: "percent",
    adjustment_value: 5,
    policy_group: "principal_removal",
  }),
  rule({
    action_id: "stop:c",
    direction: "remove",
    adjustment_type: "percent",
    adjustment_value: 5,
    policy_group: "principal_removal",
  }),
  rule({
    action_id: "stop:d",
    direction: "remove",
    adjustment_type: "percent",
    adjustment_value: 5,
    policy_group: "principal_removal",
  }),
  rule({ action_id: "stop:free", direction: "remove", adjustment_value: 0 }),
  rule({ action_id: "stop:boat", direction: "remove", adjustment_value: 120, unit: "per_group" }),
  rule({ action_id: "lunch", direction: "add", action_kind: "lunch", adjustment_value: 35 }),
  rule({ action_id: "stop:missing", direction: "remove", adjustment_value: null }),
  rule({ action_id: "stop:off", direction: "remove", adjustment_value: 5, active: false }),
];

const run = (
  selected: { actionId: string; direction: "add" | "remove" }[],
  adults = 2,
  minorAges: number[] = [],
) =>
  computeTailorPrice({ basePerPaxEur: 200, adults, minorAges, ageBand, rules, policies, selected });

const sum = (r: ReturnType<typeof run>) =>
  r.ok ? r.baseTotalEur + r.lines.reduce((s, l) => s + l.amountEur, 0) : NaN;

describe("Tailor price engine", () => {
  it("no changes = base price", () => {
    const r = run([]);
    expect(r.ok && r.totalEur).toBe(400);
  });
  it("2→3 and 2→4 wineries add +€20 pp each", () => {
    expect(
      (run([{ actionId: "choice-3", direction: "add" }]) as { totalEur: number }).totalEur,
    ).toBe(440);
    expect(
      (
        run([
          { actionId: "choice-3", direction: "add" },
          { actionId: "choice-4", direction: "add" },
        ]) as { totalEur: number }
      ).totalEur,
    ).toBe(480);
  });
  it("2→1 and 2→0 wineries are instantly priced", () => {
    expect(
      (run([{ actionId: "choice-2", direction: "remove" }]) as { totalEur: number }).totalEur,
    ).toBe(380);
    expect(
      (
        run([
          { actionId: "choice-2", direction: "remove" },
          { actionId: "choice-1", direction: "remove" },
        ]) as { totalEur: number }
      ).totalEur,
    ).toBe(360);
  });
  it("choice slots must be contiguous", () => {
    expect(run([{ actionId: "choice-1", direction: "remove" }])).toMatchObject({
      ok: false,
      code: "invalid_sequence",
    });
    expect(run([{ actionId: "choice-4", direction: "add" }])).toMatchObject({
      ok: false,
      code: "invalid_sequence",
    });
  });
  it("percent removals are capped (15%) by DB policy", () => {
    const r = run(
      ["a", "b", "c", "d"].map((x) => ({ actionId: `stop:${x}`, direction: "remove" as const })),
    );
    expect(r.ok && r.totalEur).toBe(340); // 200 × 0.85 × 2
  });
  it("explicit €0 is valid and adds no ledger line", () => {
    const r = run([{ actionId: "stop:free", direction: "remove" }]);
    expect(r.ok && r.totalEur).toBe(400);
    expect(r.ok && r.lines.length).toBe(0);
  });
  it("per-group changes apply once", () => {
    const r = run([{ actionId: "stop:boat", direction: "remove" }], 4);
    expect(r.ok && r.totalEur).toBe(680);
  });
  it("age bands apply to base and per-person changes", () => {
    const r = run([{ actionId: "lunch", direction: "add" }], 2, [12, 5, 1]);
    // adult 235, youth 176, child 118, infant 0
    expect(r.ok && r.totalEur).toBe(235 * 2 + 176 + 118);
  });
  it("ledger always sums to the exact total", () => {
    for (const sel of [
      [
        { actionId: "stop:a", direction: "remove" as const },
        { actionId: "lunch", direction: "add" as const },
      ],
      [
        { actionId: "choice-3", direction: "add" as const },
        { actionId: "stop:boat", direction: "remove" as const },
      ],
    ]) {
      const r = run(sel, 3, [12]);
      expect(r.ok).toBe(true);
      if (r.ok) expect(sum(r)).toBe(r.totalEur);
    }
  });
  it("rejects unknown, unpriced, inactive and duplicate actions (never €0, never manual)", () => {
    expect(run([{ actionId: "stop:nope", direction: "remove" }])).toMatchObject({
      ok: false,
      code: "unknown_action",
    });
    expect(run([{ actionId: "stop:missing", direction: "remove" }])).toMatchObject({
      ok: false,
      code: "unpriced_action",
    });
    expect(run([{ actionId: "stop:off", direction: "remove" }])).toMatchObject({
      ok: false,
      code: "inactive_action",
    });
    expect(
      run([
        { actionId: "lunch", direction: "add" },
        { actionId: "lunch", direction: "add" },
      ]),
    ).toMatchObject({ ok: false, code: "duplicate_action" });
  });
  it("bookable only when active and priced", () => {
    expect(tailorRuleBookable(rules.find((r) => r.action_id === "stop:missing"))).toBe(false);
    expect(tailorRuleBookable(rules.find((r) => r.action_id === "stop:free"))).toBe(true);
  });
});

describe("Tailor catalog + admin completeness", () => {
  it("default stops offer only removal; optional stops only addition", () => {
    for (const a of allTailorOfferedActions()) {
      if (a.kind === "stop") expect(a.direction).toBe("remove");
      if (a.kind === "optional" || a.kind === "lunch") expect(a.direction).toBe("add");
    }
  });
  it("freedom kept: wineries, palace, tiles workshop, picnic, boat, ferry removable", () => {
    const ids = (t: string) => tailorOfferedActions(t).map((a) => `${a.actionId}:${a.direction}`);
    expect(ids("arrabida-wine-allinclusive")).toEqual(
      expect.arrayContaining(["choice-2:remove", "choice-1:remove", "choice-3:add"]),
    );
    expect(ids("evora-alentejo")).toEqual(
      expect.arrayContaining(["choice-2:remove", "choice-1:remove"]),
    );
    expect(ids("sintra-cascais")).toContain("choice-1:remove");
    expect(ids("tiles-workshop")).toContain("choice-1:remove");
    expect(ids("troia-comporta").some((x) => x.startsWith("stop:") && x.includes("ferry"))).toBe(
      true,
    );
  });
  it("row status: empty = Missing price, 0 = priced, inactive is not missing", () => {
    expect(tailorRowStatus({ value: "", active: true })).toBe("missing");
    expect(tailorRowStatus({ value: "0", active: true })).toBe("priced");
    expect(tailorRowStatus({ value: "", active: false })).toBe("inactive");
  });
  it("browser and server use byte-identical calculators", () => {
    const a = readFileSync("src/lib/tailor/tailor-price-engine.ts", "utf8");
    const b = readFileSync("supabase/functions/_shared/tailor-price-engine.ts", "utf8");
    expect(b).toBe(a);
  });
  it("no manual-confirmation fallback remains", () => {
    const page = readFileSync("src/routes/tours_.$tourId.tailor.tsx", "utf8");
    const server = readFileSync("supabase/functions/create-signature-checkout/index.ts", "utf8");
    expect(page).not.toMatch(/Request this day|saveTailorHandoff|removalNeedsConfirmation/);
    expect(server).not.toMatch(/serverChoiceBelowBaseline|needs confirmation from our team/);
  });
});
