import { describe, expect, it } from "vitest";
import { sanitizeStudioSessionValue } from "@/components/studio-v3/studioSessionPrivacy";

describe("Studio session privacy", () => {
  it("removes identity, contact details and guide notes while preserving composition", () => {
    const raw = JSON.stringify({
      phase: "checkoutSummary",
      feeling: "wine-food",
      refinement: "wine-cellar-depth",
      firstName: "Private Traveller",
      guestDraft: {
        fullName: "Private Traveller",
        email: "private@example.com",
        phone: "+351 910 000 000",
        pickupAddress: "Private hotel",
        guideNotes: "Prefer an unlisted winery",
      },
    });

    const safe = JSON.parse(sanitizeStudioSessionValue(raw)) as Record<string, unknown>;

    expect(safe.phase).toBe("checkoutSummary");
    expect(safe.feeling).toBe("wine-food");
    expect(safe.refinement).toBe("wine-cellar-depth");
    expect(safe.firstName).toBeNull();
    expect(safe.guestDraft).toBeNull();

    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("Private Traveller");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("+351 910 000 000");
    expect(serialized).not.toContain("Private hotel");
    expect(serialized).not.toContain("Prefer an unlisted winery");
  });

  it("leaves malformed and non-object values unchanged", () => {
    expect(sanitizeStudioSessionValue("not-json")).toBe("not-json");
    expect(sanitizeStudioSessionValue("null")).toBe("null");
    expect(sanitizeStudioSessionValue("[]")).toBe("[]");
  });
});
