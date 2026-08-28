/**
 * Client/server availability date parity.
 *
 * Proves `computeMinDateISO` (client) derives the minimum bookable calendar
 * date in Europe/Lisbon from the actual elapsed-hours instant, matching the
 * server operating-rule gate — including near local midnight, where the old
 * UTC derivation drifted a day early.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { computeMinDateISO, validateDateISO, type OperatingRule } from "@/lib/availability";
import {
  evaluateOperatingRule,
  todayInLisbon,
} from "../../supabase/functions/_shared/tour-operating-rules";

const RULE: OperatingRule = {
  tourId: "arrabida-wine-allinclusive",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  blackoutDates: [],
  minLeadHours: 24,
  cutoffLocalTime: null,
};

describe("computeMinDateISO — Europe/Lisbon semantics", () => {
  it("uses the Lisbon calendar date, not UTC, near local midnight", () => {
    // 2026-06-30T23:30Z is already 2026-07-01 00:30 in Lisbon.
    // +24h reaches 2026-07-02 00:30 Lisbon → min date must be 2026-07-02.
    const now = new Date("2026-06-30T23:30:00Z");
    expect(now.toISOString().slice(0, 10)).toBe("2026-06-30"); // UTC would be wrong here
    expect(computeMinDateISO(24, now)).toBe("2026-07-02");
  });

  it("handles a 36h non-multiple lead without over-restricting", () => {
    // 2026-09-01 10:00Z (11:00 Lisbon) + 36h → 2026-09-02 23:00 Lisbon → 2026-09-02.
    const now = new Date("2026-09-01T10:00:00Z");
    expect(computeMinDateISO(36, now)).toBe("2026-09-02");
  });

  it("leaves a normal midday case unchanged", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(computeMinDateISO(24, now)).toBe("2026-06-16");
  });
});

describe("client/server parity", () => {
  it.each([
    ["2026-06-30T23:30:00Z", 24],
    ["2026-09-01T10:00:00Z", 36],
    ["2026-03-29T00:30:00Z", 48], // DST spring-forward night in Lisbon
    ["2026-06-15T12:00:00Z", 24],
  ])("same now/lead → same minimum allowed calendar date (%s, %ih)", (iso, lead) => {
    const now = new Date(iso);
    const clientMin = computeMinDateISO(lead, now);
    const serverMin = todayInLisbon(new Date(now.getTime() + lead * 3_600_000));
    expect(clientMin).toBe(serverMin);

    // And the server gate accepts exactly that date, rejects the day before.
    const rule = { weekdays: [0, 1, 2, 3, 4, 5, 6], blackoutDates: [], minLeadHours: lead };
    expect(evaluateOperatingRule(clientMin, rule, now)).toEqual({ ok: true });
    const dayBefore = new Date(Date.parse(clientMin + "T12:00:00Z") - 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(evaluateOperatingRule(dayBefore, rule, now)).toEqual({
      ok: false,
      reason: "min_lead",
    });
  });
});

describe("validateDateISO — weekday/blackout semantics unchanged", () => {
  it("rejects closed weekdays", () => {
    const rule = { ...RULE, weekdays: [1, 2, 3, 4, 5] }; // Mon–Fri
    const sunday = "2099-06-07"; // a Sunday, far beyond any lead time
    expect(validateDateISO(sunday, rule)).toEqual({ ok: false, reason: "weekday_closed" });
  });

  it("rejects blackout dates", () => {
    const rule = { ...RULE, blackoutDates: ["2099-06-10"] };
    expect(validateDateISO("2099-06-10", rule)).toEqual({ ok: false, reason: "blackout" });
  });

  it("accepts a valid future date", () => {
    expect(validateDateISO("2099-06-10", RULE)).toEqual({ ok: true });
  });

  it("rejects dates before the computed minimum", () => {
    expect(validateDateISO("2020-01-01", RULE)).toEqual({ ok: false, reason: "before_min" });
  });
});
