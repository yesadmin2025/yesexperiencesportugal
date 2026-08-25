import { describe, expect, it } from "vitest";

import { resolvePaidFrozenBookingSnapshot } from "@/lib/public-booking-access.server";

describe("public booking Travel File access", () => {
  it("denies a missing booking without disclosing whether a snapshot exists", () => {
    expect(resolvePaidFrozenBookingSnapshot(null)).toEqual({
      ok: false,
      status: 404,
      error: "not_found",
    });
  });

  it("denies an unpaid booking even when it contains a frozen-looking snapshot", () => {
    const snapshot = { frozenAt: "2026-08-25T12:00:00.000Z", customerName: "Guest" };

    expect(
      resolvePaidFrozenBookingSnapshot({
        status: "pending",
        booking_details: { snapshot },
      }),
    ).toEqual({ ok: false, status: 404, error: "not_found" });
  });

  it("keeps a paid booking unavailable until its snapshot is frozen", () => {
    expect(
      resolvePaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: { snapshot: { customerName: "Guest" } },
      }),
    ).toEqual({ ok: false, status: 409, error: "not_ready" });
  });

  it("returns the exact frozen snapshot for a paid booking", () => {
    const snapshot = {
      frozenAt: "2026-08-25T12:00:00.000Z",
      experienceName: "A day in Arrábida",
      pickup: "Lisbon hotel",
    };

    const result = resolvePaidFrozenBookingSnapshot({
      status: "paid",
      booking_details: { snapshot },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected Travel File access");
    expect(result.snapshot).toBe(snapshot);
  });
});
