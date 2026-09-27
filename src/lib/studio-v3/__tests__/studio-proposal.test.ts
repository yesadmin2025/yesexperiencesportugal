import { describe, it, expect } from "vitest";
import { buildStudioProposal } from "../studioProposal";
import { signatureTours as SIGNATURE_TOURS } from "@/data/signatureTours";

describe("buildStudioProposal", () => {
  it("returns null without a tour", () => {
    expect(buildStudioProposal(null, "lisbon", 120)).toBeNull();
  });
  it("omits fields with no source data", () => {
    const p = buildStudioProposal({}, null, null)!;
    expect(p.duration).toBeUndefined();
    expect(p.perPaxEur).toBeUndefined();
    expect(p.included).toEqual([]);
    expect(p.pickup).toMatch(/Lisbon/);
  });
  it("uses only the tour's real inclusions and the given price", () => {
    for (const t of SIGNATURE_TOURS) {
      const p = buildStudioProposal(t, "sintra", 150)!;
      expect(p.duration).toBe(t.durationHours);
      for (const i of p.included) expect(t.included).toContain(i);
      expect(p.included.length + p.moreIncluded).toBe(t.included.length);
      expect(p.perPaxEur).toBe(150);
    }
  });
});
