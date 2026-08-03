import { describe, expect, it } from "vitest";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  decideLivingAtlasSignature,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DISCOVERY_DOORS,
} from "@/components/studio-v3/livingAtlasTaxonomy";

describe("Living Atlas decision engine", () => {
  it("selects Fátima when living faith leads and coast/history support", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["faith-reflection", "atlantic-coast", "history-heritage"],
        leads: ["faith-reflection"],
      },
    });

    expect(result.status).toBe("clear");
    expect(result.selectedSignatureId).toBe("fatima-nazare-obidos");
  });

  it("selects Tomar when history leads and faith supports", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["history-heritage", "faith-reflection"],
        leads: ["history-heritage"],
      },
    });

    expect(result.status).toBe("clear");
    expect(result.selectedSignatureId).toBe("tomar-coimbra");
  });

  it("asks for a Precision Fork when history and wine co-lead without a distinction", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["history-heritage", "wine-table"],
        leads: ["history-heritage", "wine-table"],
      },
    });

    expect(result.status).toBe("precision-fork");
    expect(result.selectedSignatureId).toBeNull();
    expect(result.forkCandidates.map((candidate) => candidate.signatureId)).toEqual(
      expect.arrayContaining(["evora-alentejo", "roman-heritage-alentejo"]),
    );
  });

  it("resolves the Évora vs Roman Talha fork through a contextual signal", () => {
    const baseProfile = {
      selected: ["history-heritage", "wine-table"] as const,
      leads: ["history-heritage", "wine-table"] as const,
    };

    const evora = decideLivingAtlasSignature({
      profile: {
        selected: [...baseProfile.selected],
        leads: [...baseProfile.leads],
      },
      discoverySignal: "monumental-alentejo",
    });
    const talha = decideLivingAtlasSignature({
      profile: {
        selected: [...baseProfile.selected],
        leads: [...baseProfile.leads],
      },
      discoverySignal: "roman-talha-family",
    });

    expect(evora.status).toBe("clear");
    expect(evora.selectedSignatureId).toBe("evora-alentejo");
    expect(talha.status).toBe("clear");
    expect(talha.selectedSignatureId).toBe("roman-heritage-alentejo");
  });

  it("treats an explicit destination as a hard candidate filter", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["history-heritage"],
        leads: ["history-heritage"],
      },
      destinationIntent: "spiritual-coast",
    });

    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0]?.signatureId).toBe("fatima-nazare-obidos");
    expect(result.selectedSignatureId).toBe("fatima-nazare-obidos");
  });

  it("keeps Arrábida destination-contained while allowing the interest profile to choose the base", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["wine-table", "local-life", "nature-landscapes"],
        leads: ["wine-table"],
      },
      destinationIntent: "arrabida-setubal-azeitao",
      discoverySignal: "arrabida-family-wine",
    });

    expect(result.status).toBe("clear");
    expect(result.selectedSignatureId).toBe("arrabida-wine-allinclusive");
    expect(result.ranked.every((candidate) =>
      [
        "arrabida-wine-allinclusive",
        "arrabida-boat",
        "wild-beaches-picnic",
        "tiles-workshop",
        "azeitao-cheese",
      ].includes(candidate.signatureId),
    )).toBe(true);
  });

  it("gives every canonical Signature a deterministic route when its contextual signal is known", () => {
    for (const door of SIGNATURE_DISCOVERY_DOORS) {
      const selected = [...door.leads, ...door.supporting].slice(0, 3);
      const result = decideLivingAtlasSignature({
        profile: {
          selected,
          leads: [...door.leads],
        },
        discoverySignal: DISCOVERY_SIGNAL_BY_SIGNATURE[door.signatureId],
      });

      expect(result.status, door.signatureId).toBe("clear");
      expect(result.selectedSignatureId, door.signatureId).toBe(door.signatureId);
    }
  });

  it("never returns a Signature outside the canonical 12", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: ["atlantic-coast", "nature-landscapes", "local-life"],
        leads: ["atlantic-coast", "nature-landscapes"],
      },
    });

    for (const candidate of result.ranked) {
      expect(LIVING_ATLAS_SIGNATURE_IDS).toContain(candidate.signatureId);
    }
  });

  it("returns invalid instead of guessing when the profile breaks the selection contract", () => {
    const result = decideLivingAtlasSignature({
      profile: {
        selected: [],
        leads: [],
      },
    });

    expect(result.status).toBe("invalid");
    expect(result.selectedSignatureId).toBeNull();
    expect(result.validationError).toBe("select-at-least-one");
  });
});
