import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Studio operational tour language", () => {
  it("keeps the selected language on return from checkout", () => {
    const source = read("src/components/studio-v3/StudioV3.tsx");
    expect(source).toContain("language: d.language");
    expect(source).toContain('language: state.guestDraft?.language ?? (state.language === "pt" ? "pt" : "en")');
    expect(source).toContain("guestDetails: { ...details, hotelPickupIncluded: true }");
  });
  it("writes the language to the purchase snapshot", () => {
    expect(read("supabase/functions/create-signature-checkout/index.ts")).toContain("language: str(gd.language, 8)");
  });
  it("copies only supported purchased languages to bookings and preserves operations edits", () => {
    const source = read("supabase/functions/stripe-webhook/index.ts");
    expect(source).toContain("const purchasedLanguage = snapshot?.language");
    expect(source).toContain('purchasedLanguage === "en" || purchasedLanguage === "pt"');
    expect(source).toContain('.update({ language: purchasedLanguage })');
    expect(source).toContain('.is("language", null)');
    expect(source).toContain('status: 500');
  });
  it("keeps the day summary after all client fields", () => {
    const source = read("src/components/studio-v3/GuestDetailsStep.tsx");
    expect(source.indexOf('data-testid="studio-v3-guest-day-summary"')).toBeGreaterThan(source.indexOf("</CollapsibleFieldGroup>"));
  });
});