import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resumePathFor, shouldSendUnfinishedReminder } from "../unfinished-reminder";

const base = { customerName: "Sofia Martins", email: "sofia@example.com", dateExact: "2026-11-02", today: "2026-10-22", alreadyPaid: false };

describe("unfinished reservation notice", () => {
  it("sends to a real guest whose day is still ahead", () => {
    expect(shouldSendUnfinishedReminder(base)).toBe(true);
  });
  it("never sends for internal test names", () => {
    expect(shouldSendUnfinishedReminder({ ...base, customerName: "Nidia teste" })).toBe(false);
  });
  it("never sends when the guest already paid", () => {
    expect(shouldSendUnfinishedReminder({ ...base, alreadyPaid: true })).toBe(false);
  });
  it("never sends for a date already in the past", () => {
    expect(shouldSendUnfinishedReminder({ ...base, dateExact: "2026-10-21" })).toBe(false);
  });
  it("links back to the site, not to a stale payment page", () => {
    expect(resumePathFor("studio", "x")).toBe("/studio");
    expect(resumePathFor("signature", "arrabida-wine-allinclusive")).toBe("/tours/arrabida-wine-allinclusive");
  });
  it("checkout has no promo-code box and shows the tour photo", () => {
    const src = readFileSync("supabase/functions/create-signature-checkout/index.ts", "utf8");
    expect(src).toContain("allow_promotion_codes: false");
    expect(src).toContain("images: [productImageUrl]");
  });
});

import { isInternalTestName as _isInternal } from "../unfinished-reminder";
describe("internal name filter does not drop real surnames", () => {
  it("keeps real guests named Almeida or Nídia", () => {
    expect(_isInternal("João Almeida")).toBe(false);
    expect(_isInternal("Nídia Costa")).toBe(false);
    expect(_isInternal("Contessa Smith")).toBe(false);
  });
  it("still skips explicit test names and the founder", () => {
    expect(_isInternal("Test Booking")).toBe(true);
    expect(_isInternal("Nídia de Almeida")).toBe(true);
  });
});
