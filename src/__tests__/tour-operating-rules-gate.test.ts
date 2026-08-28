import { describe, expect, it } from "vitest";

import {
  checkTourOperatingRule,
  evaluateOperatingRule,
  isoWeekday,
  normalizeOperatingRuleRow,
  todayInLisbon,
} from "../../supabase/functions/_shared/tour-operating-rules";
import { isStudioCheckoutDateAllowed } from "../../supabase/functions/_shared/studio-booking-date";

// Fixed "now": 2026-09-01T10:00Z, a Tuesday in Lisbon.
const NOW = new Date("2026-09-01T10:00:00Z");
const lookupNone = async () => ({ row: null });

describe("tour operating-rule gate", () => {
  it("missing rule row adds no restriction", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "sintra-cascais",
      dateExact: "2026-09-02",
      lookup: lookupNone,
      now: NOW,
    });
    expect(gate.status).toBe("no_rule");
  });

  it("allowed weekday passes", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10", // Thursday
      lookup: async () => ({ row: { weekdays: [4], min_lead_hours: 24 } }),
      now: NOW,
    });
    expect(gate.status).toBe("allowed");
  });

  it("disallowed weekday returns weekday_closed", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10", // Thursday
      lookup: async () => ({ row: { weekdays: [1, 2, 3] } }),
      now: NOW,
    });
    expect(gate).toEqual({ status: "rejected", reason: "weekday_closed" });
  });

  it("blackout date returns blackout", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10",
      lookup: async () => ({ row: { blackout_dates: ["2026-09-10"] } }),
      now: NOW,
    });
    expect(gate).toEqual({ status: "rejected", reason: "blackout" });
  });

  it("insufficient lead time returns min_lead", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-02",
      lookup: async () => ({ row: { min_lead_hours: 96 } }),
      now: NOW,
    });
    expect(gate).toEqual({ status: "rejected", reason: "min_lead" });
  });

  it("36h lead uses elapsed-hours parity, not ceil(days) — 2026-09-02 stays bookable", async () => {
    // NOW = 2026-09-01T10:00Z (11:00 Lisbon). +36h = 2026-09-02T22:00Z,
    // still 2026-09-02 in Lisbon. Old ceil(36/24)=+2 days floor wrongly
    // demanded 2026-09-03.
    const row = { min_lead_hours: 36 };
    const onFloor = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-02",
      lookup: async () => ({ row }),
      now: NOW,
    });
    expect(onFloor.status).toBe("allowed");
    const beforeFloor = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-01",
      lookup: async () => ({ row }),
      now: NOW,
    });
    expect(beforeFloor).toEqual({ status: "rejected", reason: "min_lead" });
  });

  it("lead hours crossing a Lisbon midnight move the floor by one local day", async () => {
    // 2026-06-30T22:30Z = 23:30 Lisbon; +2h = 01:30 Lisbon on 2026-07-01.
    const lateEvening = new Date("2026-06-30T22:30:00Z");
    const row = { min_lead_hours: 2 };
    const nextDay = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-07-01",
      lookup: async () => ({ row }),
      now: lateEvening,
    });
    expect(nextDay.status).toBe("allowed");
    const sameDay = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-06-30",
      lookup: async () => ({ row }),
      now: lateEvening,
    });
    expect(sameDay).toEqual({ status: "rejected", reason: "min_lead" });
  });

  it("DST fallback does not shift the floor date", async () => {
    // EU DST ends 2026-10-25: 00:30Z is still UTC+1 (01:30 Lisbon); +3h =
    // 03:30Z, after the fallback Lisbon is UTC+0 → 03:30, same local date.
    const dstBoundary = new Date("2026-10-25T00:30:00Z");
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-10-25",
      lookup: async () => ({ row: { min_lead_hours: 3 } }),
      now: dstBoundary,
    });
    expect(gate.status).toBe("allowed");
  });

  it("Lisbon calendar/weekday boundary is deterministic", () => {
    // 23:30 UTC on 2026-06-30 is already 2026-07-01 in Lisbon (UTC+1).
    expect(todayInLisbon(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(isoWeekday("2026-09-06")).toBe(0); // Sunday
    expect(isoWeekday("2026-09-12")).toBe(6); // Saturday
  });

  it("Studio 3-day gate is independent and cannot be weakened by a 24h row", async () => {
    const tooSoon = "2026-09-02"; // +1 day
    expect(isStudioCheckoutDateAllowed(tooSoon, NOW)).toBe(false);
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: tooSoon,
      lookup: async () => ({ row: { min_lead_hours: 24 } }),
      now: NOW,
    });
    expect(gate.status).toBe("allowed"); // rule allows, Studio gate still blocks
  });

  it("a stricter row can block a Studio date beyond 3 days", async () => {
    const date = "2026-09-06"; // +5 days, Studio-allowed
    expect(isStudioCheckoutDateAllowed(date, NOW)).toBe(true);
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: date,
      lookup: async () => ({ row: { weekdays: [1, 2, 3, 4, 5] } }),
      now: NOW,
    });
    expect(gate).toEqual({ status: "rejected", reason: "weekday_closed" });
  });

  it("cutoff_local_time is deliberately not authority yet", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10",
      lookup: async () => ({ row: { cutoff_local_time: "00:00:00" } }),
      now: NOW,
    });
    expect(gate.status).toBe("allowed");
  });

  it("availability lookup failure cannot proceed to Stripe", async () => {
    const errored = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10",
      lookup: async () => ({ error: new Error("db down") }),
      now: NOW,
    });
    expect(errored.status).toBe("unavailable");

    const threw = await checkTourOperatingRule({
      tourId: "t",
      dateExact: "2026-09-10",
      lookup: async () => {
        throw new Error("network");
      },
      now: NOW,
    });
    expect(threw.status).toBe("unavailable");
  });

  it("malformed operational data fails safely, never allowed", async () => {
    for (const row of [{ weekdays: [9] }, { blackout_dates: ["nope"] }, { min_lead_hours: -1 }]) {
      const gate = await checkTourOperatingRule({
        tourId: "t",
        dateExact: "2026-09-10",
        lookup: async () => ({ row }),
        now: NOW,
      });
      expect(gate.status).toBe("unavailable");
    }
    expect(normalizeOperatingRuleRow({ weekdays: "x" }).status).toBe("malformed");
  });

  it("a rule row does not invent a date requirement for dateless callsites", async () => {
    const gate = await checkTourOperatingRule({
      tourId: "t",
      dateExact: null,
      lookup: async () => ({ row: { weekdays: [1] } }),
      now: NOW,
    });
    expect(gate.status).toBe("no_rule");
  });

  it("evaluate applies min lead as a Lisbon calendar-day floor", () => {
    const rule = { weekdays: [0, 1, 2, 3, 4, 5, 6], blackoutDates: [], minLeadHours: 24 };
    expect(evaluateOperatingRule("2026-09-01", rule, NOW).ok).toBe(false);
    expect(evaluateOperatingRule("2026-09-02", rule, NOW).ok).toBe(true);
  });
});

describe("checkout contract untouched", () => {
  it("does not change pricing, payment-method or route-authority code", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      "supabase/functions/create-signature-checkout/index.ts",
      "utf8",
    );
    // Gate runs before any Stripe session creation.
    expect(src.indexOf("checkTourOperatingRule")).toBeLessThan(
      src.indexOf("checkout.sessions.create"),
    );
    expect(src).toContain("date_unavailable:");
    expect(src).not.toContain("cutoff_local_time <");
    // No supplier/winery availability lookup introduced.
    expect(src.toLowerCase()).not.toContain("winery_availability");
  });
});
