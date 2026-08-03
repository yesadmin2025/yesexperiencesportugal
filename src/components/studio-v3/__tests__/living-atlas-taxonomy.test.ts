import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_DIMENSION_IDS,
  LIVING_ATLAS_SIGNATURE_IDS,
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  SIGNATURE_DIMENSION_AFFINITY,
  SIGNATURE_DISCOVERY_DOORS,
  discoveryDoorFor,
  validateExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";

describe("Living Atlas experience taxonomy", () => {
  it("allows one to three selected dimensions", () => {
    expect(
      validateExperienceProfile({
        selected: ["history-heritage"],
        leads: ["history-heritage"],
      }).ok,
    ).toBe(true);

    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table", "local-life"],
        leads: ["history-heritage", "wine-table"],
      }).ok,
    ).toBe(true);

    expect(MAX_SELECTED_DIMENSIONS).toBe(3);
  });

  it("rejects a fourth selected dimension", () => {
    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table", "local-life", "atlantic-coast"],
        leads: ["history-heritage"],
      }),
    ).toEqual({ ok: false, reason: "select-at-most-three" });
  });

  it("allows one lead or two co-leads, never more", () => {
    expect(MAX_LEAD_DIMENSIONS).toBe(2);
    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table"],
        leads: ["history-heritage", "wine-table"],
      }).ok,
    ).toBe(true);

    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table", "local-life"],
        leads: ["history-heritage", "wine-table", "local-life"],
      }),
    ).toEqual({ ok: false, reason: "lead-at-most-two" });
  });

  it("requires every lead to be one of the selected dimensions", () => {
    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table"],
        leads: ["atlantic-coast"],
      }),
    ).toEqual({ ok: false, reason: "lead-must-be-selected" });
  });

  it("rejects duplicate selections and duplicate leads", () => {
    expect(
      validateExperienceProfile({
        selected: ["wine-table", "wine-table"],
        leads: ["wine-table"],
      }),
    ).toEqual({ ok: false, reason: "duplicate-selection" });

    expect(
      validateExperienceProfile({
        selected: ["history-heritage", "wine-table"],
        leads: ["history-heritage", "history-heritage"],
      }),
    ).toEqual({ ok: false, reason: "duplicate-lead" });
  });

  it("defines an affinity for every dimension on every Signature", () => {
    for (const signatureId of LIVING_ATLAS_SIGNATURE_IDS) {
      const affinity = SIGNATURE_DIMENSION_AFFINITY[signatureId];
      expect(affinity).toBeTruthy();
      for (const dimensionId of EXPERIENCE_DIMENSION_IDS) {
        expect(affinity[dimensionId]).toBeGreaterThanOrEqual(0);
        expect(affinity[dimensionId]).toBeLessThanOrEqual(3);
      }
    }
  });

  it("gives every Signature at least one structural dimension", () => {
    for (const signatureId of LIVING_ATLAS_SIGNATURE_IDS) {
      const strengths = Object.values(SIGNATURE_DIMENSION_AFFINITY[signatureId]);
      expect(strengths.some((strength) => strength === 3)).toBe(true);
    }
  });

  it("gives all 12 Signatures a deterministic discovery door", () => {
    expect(SIGNATURE_DISCOVERY_DOORS).toHaveLength(12);
    expect(new Set(SIGNATURE_DISCOVERY_DOORS.map((door) => door.signatureId)).size).toBe(12);

    for (const signatureId of LIVING_ATLAS_SIGNATURE_IDS) {
      const door = discoveryDoorFor(signatureId);
      expect(door.signatureId).toBe(signatureId);
      expect(door.leads.length).toBeGreaterThanOrEqual(1);
      expect(door.leads.length).toBeLessThanOrEqual(2);
      expect(door.distinction.trim().length).toBeGreaterThan(20);
    }
  });

  it("keeps Fátima and Tomar meaningfully distinct", () => {
    const fatima = discoveryDoorFor("fatima-nazare-obidos");
    const tomar = discoveryDoorFor("tomar-coimbra");

    expect(fatima.leads).toContain("faith-reflection");
    expect(tomar.leads).toContain("history-heritage");
    expect(fatima.distinction).not.toBe(tomar.distinction);
  });

  it("keeps Évora and Roman Talha reachable through the same co-leads but distinct stories", () => {
    const evora = discoveryDoorFor("evora-alentejo");
    const talha = discoveryDoorFor("roman-heritage-alentejo");

    expect(evora.leads).toEqual(["history-heritage", "wine-table"]);
    expect(talha.leads).toEqual(["history-heritage", "wine-table"]);
    expect(evora.distinction).not.toBe(talha.distinction);
  });
});
