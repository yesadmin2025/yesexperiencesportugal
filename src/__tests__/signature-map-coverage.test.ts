import { describe, it, expect } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";

describe("Signature tour map coverage", () => {
  it("every Signature has at least 2 resolvable stops (so RouteMap renders)", () => {
    const failing: string[] = [];
    for (const t of signatureTours) {
      const resolved = (t.stops ?? []).filter((s) => lookupStop(s.label));
      const missing = (t.stops ?? []).filter((s) => !lookupStop(s.label)).map((s) => s.label);
      if (resolved.length < 2) {
        failing.push(
          `${t.id} → resolved=${resolved.length}/${(t.stops ?? []).length}, missing: ${missing.join(" | ")}`,
        );
      }
    }
    if (failing.length) {
      console.log("\n" + failing.join("\n") + "\n");
    }
    expect(failing).toEqual([]);
  });
});
