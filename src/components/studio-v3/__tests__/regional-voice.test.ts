import { describe, expect, it } from "vitest";
import { regionalVoiceFor } from "../regionalVoice";

describe("regionalVoiceFor", () => {
  it("returns Arrábida voice for Setúbal / Arrábida / Sesimbra / Azeitão regions", () => {
    for (const r of [
      "Setúbal · Arrábida",
      "Arrábida · Sesimbra",
      "Azeitão · Sesimbra",
      "SETUBAL",
    ]) {
      const v = regionalVoiceFor(r);
      expect(v.eyebrow).toBe("ARRÁBIDA VOICE");
      expect(v.whisper.length).toBeGreaterThan(0);
    }
  });

  it("returns Alentejo voice for Alentejo / Comporta / Évora", () => {
    expect(regionalVoiceFor("Alentejo").eyebrow).toBe("ALENTEJO VOICE");
    expect(regionalVoiceFor("Comporta").eyebrow).toBe("ALENTEJO VOICE");
    expect(regionalVoiceFor("Évora").eyebrow).toBe("ALENTEJO VOICE");
  });

  it("returns Lisbon Coast voice for Sintra / Cascais / Cabo da Roca", () => {
    expect(regionalVoiceFor("Sintra").eyebrow).toBe("LISBON COAST VOICE");
    expect(regionalVoiceFor("Cascais").eyebrow).toBe("LISBON COAST VOICE");
    expect(regionalVoiceFor("Lisbon Coast").eyebrow).toBe("LISBON COAST VOICE");
  });

  it("falls back to default voice for null / unknown regions", () => {
    expect(regionalVoiceFor(null).eyebrow).toBe("PORTUGAL VOICE");
    expect(regionalVoiceFor(undefined).eyebrow).toBe("PORTUGAL VOICE");
    expect(regionalVoiceFor("Mars").eyebrow).toBe("PORTUGAL VOICE");
  });

  it("never invents partners, stops, or prices — whisper is short felt-sense only", () => {
    for (const r of ["Arrábida", "Alentejo", "Douro", "Algarve", "Centro"]) {
      const v = regionalVoiceFor(r);
      expect(v.whisper.length).toBeLessThan(60);
      expect(v.whisper).not.toMatch(/€|partner|operator|Bokun|Viator/i);
    }
  });
});
