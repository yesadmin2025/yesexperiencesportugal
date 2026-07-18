/**
 * Invariant: /admin/image-swap NEVER adds new slots. publishOverridesBatch
 * must reject any slotIndex outside the module's default range.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ in: () => ({ data: [], error: null }) }) }) }),
      upsert: async () => ({ error: null }),
      delete: () => ({ eq: () => ({ eq: () => ({ in: () => ({ error: null }) }) }) }),
    }),
  },
}));

import { publishOverridesBatch } from "@/lib/editorial-overrides";

describe("publishOverridesBatch — slot range guard", () => {
  it("rejects slotIndex >= module max", async () => {
    await expect(
      publishOverridesBatch(
        "homepage_moments",
        [{ slotIndex: 5, photoSrc: "x.jpg", alt: "a", caption: null }],
        4,
      ),
    ).rejects.toThrow(/fora do intervalo/);
  });

  it("rejects negative slotIndex", async () => {
    await expect(
      publishOverridesBatch(
        "homepage_moments",
        [{ slotIndex: -1, photoSrc: "x.jpg", alt: "a", caption: null }],
        4,
      ),
    ).rejects.toThrow(/fora do intervalo/);
  });

  it("accepts valid slotIndex within range", async () => {
    await expect(
      publishOverridesBatch(
        "homepage_moments",
        [{ slotIndex: 0, photoSrc: "x.jpg", alt: "a", caption: null }],
        4,
      ),
    ).resolves.toBeDefined();
  });
});
