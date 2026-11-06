// @vitest-environment-options { "url": "https://yesexperiencesportugal.com/tours/x" }
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackBookingStart } from "../site-visit-beacon";

const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
const starts = () =>
  fetchMock.mock.calls.filter((c) => JSON.parse(String(c[1].body)).event === "booking_start");

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

describe("booking_start beacon", () => {
  it.each(["signature", "tailor", "studio"] as const)("%s fires once across reopenings", (flow) => {
    trackBookingStart(flow, "/tours/x");
    trackBookingStart(flow, "/tours/x");
    trackBookingStart(flow, "/tours/x");
    expect(starts()).toHaveLength(1);
  });
  it("separate flows each count once", () => {
    trackBookingStart("signature", "/tours/x");
    trackBookingStart("tailor", "/tours/x/tailor");
    expect(starts()).toHaveLength(2);
  });
});

const src = (p: string) => readFileSync(p, "utf8");
describe("wiring", () => {
  it("tailor fires only after the last validation guard", () => {
    const s = src("src/routes/tours_.$tourId.tailor.tsx");
    const call = s.indexOf('trackBookingStart("tailor"');
    expect(call).toBeGreaterThan(s.indexOf('reason: "no_stops"'));
    expect(call).toBeLessThan(s.indexOf("setDetailsOpen(true)", call - 200) + 200);
  });
  it("signature fires inside the guest-details effect guarded by detailsOpen", () => {
    const s = src("src/components/SimpleBookingForm.tsx");
    const call = s.indexOf('trackBookingStart("signature"');
    expect(call).toBeGreaterThan(s.indexOf("if (!detailsOpen) return;"));
  });
  it("studio fires only on the guestDetails phase", () => {
    expect(src("src/components/studio-v3/StudioV3.tsx")).toContain(
      'if (state.phase === "guestDetails") trackBookingStart("studio"',
    );
  });
  it("root no longer emits path-based booking_start", () => {
    expect(src("src/routes/__root.tsx")).not.toContain('"booking_start"');
  });
});
