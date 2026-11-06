import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PENDING_VENUE_SIGNATURE_IDS } from "@/data/pendingSignatures";

const homepage = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
const featuredBlock = homepage.match(/const FEATURED_TOUR_IDS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const featuredIds = Array.from(featuredBlock.matchAll(/"([^"]+)"/g), (match) => match[1]);

describe("homepage commercially available featured Signatures", () => {
  it("features exactly the four approved Signatures in their original order", () => {
    expect(featuredIds).toEqual([
      "arrabida-wine-allinclusive",
      "troia-comporta",
      "evora-alentejo",
      "roman-heritage-alentejo",
    ]);
  });

  it("never advertises a pending-venue Signature in the featured selection", () => {
    expect(featuredIds.filter((id) => PENDING_VENUE_SIGNATURE_IDS.has(id))).toEqual([]);
  });
});