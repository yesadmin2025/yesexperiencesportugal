/**
 * Guest reviews submitted on /reviews are stored as first-party rows
 * (`is_first_party: true`, pending, unpublished). The admin moderation queue
 * previously filtered those rows OUT, so real guest submissions never reached
 * the approval screen. This lock keeps the queue source-agnostic.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("admin review moderation queue", () => {
  const adminFns = read("src/lib/reviewsAdmin.functions.ts");
  const publicFns = read("src/lib/reviewsPublic.functions.ts");

  it("does not exclude first-party guest reviews from the pending queue", () => {
    expect(adminFns).not.toMatch(/is_first_party["']?,\s*false/);
    expect(adminFns).not.toContain('.eq("is_first_party", false)');
  });

  it("still stores public guest submissions as pending and unpublished", () => {
    expect(publicFns).toContain('moderation_status: "pending"');
    expect(publicFns).toContain("is_published: false");
  });
});
