import { describe, expect, it } from "vitest";
import { adPermission, AD_NOTICE_VERSION, requiresAdConsent, GOOGLE_ADS_ID } from "../google-ads";

describe("Google Ads advertising permission", () => {
  it("uses the destination supplied by Nidia", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-18281912739");
  });
  it("blocks consent and unknown regions before a recorded choice", () => {
    for (const country of ["PT", "GB", "CH", "CA", "XX", "T1", null]) {
      expect(adPermission(null, country)).toBe(false);
    }
  });
  it("allows ordinary tracking outside consent regions", () => {
    expect(requiresAdConsent("US")).toBe(false);
    expect(adPermission(null, "US")).toBe(true);
  });
  it("never overrides an explicit refusal with geography", () => {
    expect(adPermission({ ads: "denied" }, "US")).toBe(false);
  });
  it("accepts the disclosed marketing choice independently of analytics", () => {
    expect(adPermission({ ads: "granted", noticeVersion: AD_NOTICE_VERSION }, "PT")).toBe(true);
  });
  it("does not treat the old undisclosed notice as acceptance for Google Ads", () => {
    expect(adPermission({ ads: "granted" }, "PT")).toBe(false);
  });
});