import { beforeEach, describe, expect, it } from "vitest";

import {
  __testing,
  setAnalyticsConsent,
  setAnalyticsLocale,
  trackEvent,
} from "../analytics-events";

const ORIGINAL_VITEST = process.env.VITEST;

function dl(): Array<Record<string, unknown>> {
  return (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
}

beforeEach(() => {
  (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  __testing.reset();
  // Bypass isTest() in analytics libs so pushes land.
  delete process.env.VITEST;
});

function restore() {
  if (ORIGINAL_VITEST !== undefined) process.env.VITEST = ORIGINAL_VITEST;
}

describe("analytics-events.trackEvent", () => {
  it("enriches with page_path + language + device", () => {
    setAnalyticsLocale("pt");
    trackEvent("hero_open_studio", { placement: "hero" });
    restore();
    const evt = dl().find((e) => e.event === "hero_open_studio");
    expect(evt).toBeTruthy();
    expect(evt!.language).toBe("pt");
    expect(evt!.placement).toBe("hero");
    expect(typeof evt!.page_path).toBe("string");
  });

  it("strips PII keys (email/phone/name/message)", () => {
    trackEvent("contact_form_submitted", {
      placement: "contact",
      // deliberate PII — must be dropped
      email: "a@b.pt",
      phone: "+351911",
      name: "John",
      message: "hi",
    } as never);
    restore();
    const evt = dl().find((e) => e.event === "contact_form_submitted")!;
    expect(evt.email).toBeUndefined();
    expect(evt.phone).toBeUndefined();
    expect(evt.name).toBeUndefined();
    expect(evt.message).toBeUndefined();
  });

  it("dedupes identical events fired within 800ms", () => {
    trackEvent("signature_reserve_click", { experience_id: "sintra", placement: "hero" });
    trackEvent("signature_reserve_click", { experience_id: "sintra", placement: "hero" });
    restore();
    const hits = dl().filter((e) => e.event === "signature_reserve_click");
    expect(hits).toHaveLength(1);
  });

  it("queues events while consent is denied and flushes on grant", () => {
    setAnalyticsConsent("denied");
    trackEvent("whatsapp_click", { placement: "footer" });
    expect(dl().find((e) => e.event === "whatsapp_click")).toBeUndefined();
    expect(__testing.queueLength()).toBe(1);
    // The flush path pushes through track(), which is also test-gated —
    // keep VITEST unset until after the grant so the flush is observable.
    setAnalyticsConsent("granted");
    restore();
    expect(__testing.queueLength()).toBe(0);
    expect(dl().find((e) => e.event === "whatsapp_click")).toBeTruthy();
  });
});
