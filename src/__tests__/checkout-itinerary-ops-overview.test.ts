import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("checkout itinerary and private operations overview", () => {
  it("projects Signature stops from the same public SoT used by the tour page", () => {
    const form = read("src/components/SimpleBookingForm.tsx");
    expect(form).toContain("projectPublicSotItinerary(tour.id)");
    expect(form).toContain("toEditorialChapters(tour.id)");
    expect(form).toContain("itinerary,");
  });

  it("displays the complete Tailored selection without truncating stops", () => {
    const route = read("src/routes/tours_.$tourId.tailor.tsx");
    expect(route).toContain("itinerary: stopLabels.map((label) => ({ label }))");
    expect(route).toContain("itinerary: publicSelectionLabels.map((label) => ({ label }))");
  });

  it("requires admin for file history and uses short-lived URLs", () => {
    const server = read("src/lib/operationsOverview.functions.ts");
    expect(server).toContain(".middleware([requireSupabaseAuth])");
    expect(server.match(/await authorize\(context\)/g)).toHaveLength(2);
    expect(server).toContain('createSignedUrl(row.file_path, 300)');
    expect(server).toContain('.not("stripe_session_id", "is", null)');
  });
});