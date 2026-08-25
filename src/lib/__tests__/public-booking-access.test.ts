import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isValidBookingReference,
  publicBookingDenialResponse,
  resolvePublicBookingAccess,
} from "../public-booking-access.server";

const snapshot = {
  frozenAt: "2026-08-25T10:00:00.000Z",
  experienceName: "Private Sintra & Cascais Tour",
  itinerary: [{ order: 1, label: "Pena Palace" }],
};

describe("resolvePublicBookingAccess", () => {
  it("denies a missing row without disclosing anything", () => {
    expect(resolvePublicBookingAccess(null)).toEqual({ kind: "not_found" });
    expect(resolvePublicBookingAccess(undefined)).toEqual({ kind: "not_found" });
  });

  it("denies an unpaid row even when it already carries a frozen snapshot", () => {
    for (const status of ["pending", "failed", "cancelled", "refunded"]) {
      expect(
        resolvePublicBookingAccess({ status, booking_details: { snapshot } }),
      ).toEqual({ kind: "not_found" });
    }
  });

  it("reports not_ready for a paid row whose snapshot is missing or malformed", () => {
    expect(resolvePublicBookingAccess({ status: "paid" })).toEqual({ kind: "not_ready" });
    expect(resolvePublicBookingAccess({ status: "paid", booking_details: {} })).toEqual({
      kind: "not_ready",
    });
    expect(
      resolvePublicBookingAccess({ status: "paid", booking_details: { snapshot: [] } }),
    ).toEqual({ kind: "not_ready" });
  });

  it("reports not_ready for a paid snapshot without a non-empty frozenAt", () => {
    const { frozenAt: _drop, ...unfrozen } = snapshot;
    expect(
      resolvePublicBookingAccess({ status: "paid", booking_details: { snapshot: unfrozen } }),
    ).toEqual({ kind: "not_ready" });
    expect(
      resolvePublicBookingAccess({
        status: "paid",
        booking_details: { snapshot: { ...snapshot, frozenAt: "   " } },
      }),
    ).toEqual({ kind: "not_ready" });
  });

  it("grants access for a paid row with a frozen snapshot and returns it exactly", () => {
    const result = resolvePublicBookingAccess({
      status: "paid",
      booking_details: { snapshot },
    });
    expect(result).toEqual({ kind: "granted", snapshot, frozenAt: snapshot.frozenAt });
    if (result.kind === "granted") expect(result.snapshot).toBe(snapshot);
  });
});

describe("booking reference + denial responses", () => {
  it("accepts only Stripe checkout session ids", () => {
    expect(isValidBookingReference(`cs_test_${"a".repeat(30)}`)).toBe(true);
    expect(isValidBookingReference("cs_test_short")).toBe(false);
    expect(isValidBookingReference("1")).toBe(false);
  });

  it("uses 404 for not_found and 409 for not_ready", () => {
    expect(publicBookingDenialResponse({ kind: "not_found" }).status).toBe(404);
    expect(publicBookingDenialResponse({ kind: "not_ready" }).status).toBe(409);
  });
});

describe("public Travel File routes", () => {
  const routes = [
    "src/routes/api/public/booking-itinerary-data.ts",
    "src/routes/api/public/booking-itinerary.ts",
  ];

  it("no longer read the pre-payment booking_snapshots draft table", () => {
    for (const route of routes) {
      const src = readFileSync(route, "utf8");
      expect(src).not.toContain("booking_snapshots");
      expect(src).toContain("loadPublicBookingAccess");
    }
  });
});

describe("booking-confirmed Travel File gating", () => {
  it("renders the Travel File card only when the session is verified paid", () => {
    const src = readFileSync("src/routes/booking-confirmed.tsx", "utf8");
    expect(src).toContain("{session_id && paid ?");
    expect(src).not.toContain("itinerary link below stays valid either way");
  });
});

describe("booking-receipt paid-only disclosure", () => {
  const src = readFileSync("src/routes/booking-receipt.tsx", "utf8");

  it("only builds receipt data from a paid session", () => {
    expect(src).toContain("const data = paid && state.kind === \"ok\" ? state.data : null;");
  });

  it("gates the itinerary download and shows a restrained pending state", () => {
    expect(src).toContain("{session_id && paid ?");
    expect(src).toContain("receipt-not-confirmed");
  });
});
