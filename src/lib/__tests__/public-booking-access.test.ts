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
    expect(resolvePublicBookingAccess(null)).toEqual({ kind: "denied" });
    expect(resolvePublicBookingAccess(undefined)).toEqual({ kind: "denied" });
  });

  it("denies an unpaid row even when it already carries a frozen snapshot", () => {
    for (const status of ["pending", "failed", "cancelled", "refunded"]) {
      expect(resolvePublicBookingAccess({ status, booking_details: { snapshot } })).toEqual({
        kind: "denied",
      });
    }
  });

  it("denies paid rows whose snapshot is missing, malformed, or not frozen", () => {
    expect(resolvePublicBookingAccess({ status: "paid" })).toEqual({ kind: "denied" });
    expect(resolvePublicBookingAccess({ status: "paid", booking_details: {} })).toEqual({
      kind: "denied",
    });
    expect(
      resolvePublicBookingAccess({ status: "paid", booking_details: { snapshot: [] } }),
    ).toEqual({ kind: "denied" });

    const { frozenAt: _drop, ...unfrozen } = snapshot;
    expect(
      resolvePublicBookingAccess({ status: "paid", booking_details: { snapshot: unfrozen } }),
    ).toEqual({ kind: "denied" });
    expect(
      resolvePublicBookingAccess({
        status: "paid",
        booking_details: { snapshot: { ...snapshot, frozenAt: "   " } },
      }),
    ).toEqual({ kind: "denied" });
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

  it("makes every denied valid reference externally indistinguishable", async () => {
    const denied = publicBookingDenialResponse({ kind: "denied" });
    expect(denied.status).toBe(404);
    await expect(denied.json()).resolves.toEqual({ ok: false, error: "not_found" });
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
