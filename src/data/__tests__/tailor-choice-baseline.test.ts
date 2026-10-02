import { describe, expect, it } from "vitest";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import { choiceBaselineCount, choiceBelowBaseline } from "@/data/tailorChoiceBaseline";
import { tailorSupplementsEur } from "@/data/tailorRules";
import {
  TAILOR_CHOICE_BASELINE,
  serverChoiceBelowBaseline,
} from "../../../supabase/functions/_shared/pricing";

const below = (id: string, n: number) =>
  choiceBelowBaseline(id, { choiceSelectedCount: n, wineriesSelected: n });

describe("Tailor below-baseline choice reductions require confirmation", () => {
  it("a/b Arrábida Wine 2→1 and 2→0 wineries", () => {
    expect(below("arrabida-wine-allinclusive", 2)).toBe(false);
    expect(below("arrabida-wine-allinclusive", 1)).toBe(true);
    expect(below("arrabida-wine-allinclusive", 0)).toBe(true);
    expect(serverChoiceBelowBaseline("arrabida-wine-allinclusive", ["jmf"])).toBe(true);
    expect(serverChoiceBelowBaseline("arrabida-wine-allinclusive", [])).toBe(true);
    expect(serverChoiceBelowBaseline("arrabida-wine-allinclusive", ["jmf", "bacalhoa"])).toBe(false);
  });
  it("c Évora 2→1/0", () => {
    expect(below("evora-alentejo", 1)).toBe(true);
    expect(below("evora-alentejo", 0)).toBe(true);
    expect(serverChoiceBelowBaseline("evora-alentejo", ["ramos"])).toBe(true);
  });
  it("d tiles-workshop 1→0 winery", () => {
    expect(below("tiles-workshop", 0)).toBe(true);
    expect(serverChoiceBelowBaseline("tiles-workshop", [])).toBe(true);
    expect(serverChoiceBelowBaseline("tiles-workshop", ["jmf"])).toBe(false);
  });
  it("e Sintra palace 1→0", () => {
    expect(below("sintra-cascais", 0)).toBe(true);
    expect(serverChoiceBelowBaseline("sintra-cascais", undefined)).toBe(true);
    expect(serverChoiceBelowBaseline("sintra-cascais", ["pena"])).toBe(false);
  });
  it("server refuses invented / duplicated ids", () => {
    expect(serverChoiceBelowBaseline("arrabida-wine-allinclusive", ["jmf", "jmf"])).toBe(true);
    expect(serverChoiceBelowBaseline("arrabida-wine-allinclusive", ["jmf", "fake"])).toBe(true);
  });
  it("f above-baseline approved supplements still price as before", () => {
    expect(below("arrabida-wine-allinclusive", 3)).toBe(false);
    expect(tailorSupplementsEur("arrabida-wine-allinclusive", { lunchAdded: false, wineriesSelected: 3 })).toBeGreaterThan(0);
    expect(tailorSupplementsEur("arrabida-wine-allinclusive", { lunchAdded: false, wineriesSelected: 2 })).toBe(0);
  });
  it("server baseline map mirrors client blueprints", () => {
    for (const [id, bp] of Object.entries(TAILOR_BLUEPRINTS)) {
      if (!bp.choice) continue;
      const entry = TAILOR_CHOICE_BASELINE[id];
      expect(entry, id).toBeDefined();
      expect([...entry.ids].sort()).toEqual(bp.choice.options.map((o) => o.id).sort());
      expect(entry.baseline).toBe(choiceBaselineCount(id));
    }
  });
});
