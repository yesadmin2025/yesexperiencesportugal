import { describe, expect, it } from "vitest";

import {
  isAutomatedContext,
  isCanonicalPaymentHost,
  livePaymentsGuardViolation,
  resolvePaymentsEnvironment,
} from "@/lib/payments-environment";

describe("payments environment lock", () => {
  it("recognises only the canonical production hosts", () => {
    expect(isCanonicalPaymentHost("yesexperiencesportugal.com")).toBe(true);
    expect(isCanonicalPaymentHost("www.yesexperiencesportugal.com")).toBe(true);
    expect(isCanonicalPaymentHost("YESEXPERIENCESPORTUGAL.COM.")).toBe(true);
    expect(isCanonicalPaymentHost("preview.lovable.app")).toBe(false);
    expect(isCanonicalPaymentHost("localhost")).toBe(false);
    expect(isCanonicalPaymentHost("evil-yesexperiencesportugal.com")).toBe(false);
  });

  it("resolves live only on canonical hosts with a live key", () => {
    expect(
      resolvePaymentsEnvironment({
        hostname: "yesexperiencesportugal.com",
        publishableKey: "pk_live_abc",
      }),
    ).toBe("live");

    for (const hostname of [
      "id-preview--x.lovable.app",
      "localhost",
      "127.0.0.1",
      "some-branch.vercel.app",
    ]) {
      expect(resolvePaymentsEnvironment({ hostname, publishableKey: "pk_live_abc" })).toBe(
        "sandbox",
      );
    }
  });

  it("forces sandbox for test keys and automated sessions", () => {
    expect(
      resolvePaymentsEnvironment({
        hostname: "yesexperiencesportugal.com",
        publishableKey: "pk_test_abc",
      }),
    ).toBe("sandbox");
    expect(
      resolvePaymentsEnvironment({
        hostname: "yesexperiencesportugal.com",
        publishableKey: "pk_live_abc",
        automated: true,
      }),
    ).toBe("sandbox");
  });

  it("detects automated contexts", () => {
    expect(isAutomatedContext({ webdriver: true })).toBe(true);
    expect(isAutomatedContext({ userAgent: "Mozilla/5.0 HeadlessChrome/120" })).toBe(true);
    expect(isAutomatedContext({ userAgent: "Mozilla/5.0 Safari/605" })).toBe(false);
  });

  it("flags illegal live-key usage", () => {
    expect(
      livePaymentsGuardViolation({
        hostname: "yesexperiencesportugal.com",
        publishableKey: "pk_live_abc",
      }),
    ).toBeNull();
    expect(
      livePaymentsGuardViolation({ hostname: "localhost", publishableKey: "pk_live_abc" }),
    ).toMatch(/non-canonical host/);
    expect(
      livePaymentsGuardViolation({
        hostname: "yesexperiencesportugal.com",
        publishableKey: "pk_live_abc",
        automated: true,
      }),
    ).toMatch(/automated/);
    expect(
      livePaymentsGuardViolation({ hostname: "localhost", publishableKey: "pk_test_abc" }),
    ).toBeNull();
  });
});
