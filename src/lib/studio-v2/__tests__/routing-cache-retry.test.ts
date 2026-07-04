/**
 * Integration test — OSRM retry + cache behaviour in `resolveLegs`.
 *
 * Verifies:
 *   1. A transient OSRM failure is retried with backoff, and the eventual
 *      success is returned (not a haversine fallback).
 *   2. The second call for the same (from, to) pair reads from the
 *      in-memory cache stub and does NOT hit `fetch` again.
 *   3. When every attempt fails, `resolveLegs` still returns a leg —
 *      falling back to haversine — instead of throwing.
 *
 * The Supabase admin client is stubbed with a simple in-memory
 * `Map<from::to, row>` so we don't need real network / DB access.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Shared in-memory cache used by the stubbed supabase client. */
const cacheRows = new Map<string, Record<string, unknown>>();

vi.mock("@/integrations/supabase/client.server", () => {
  const from = () => {
    const state: { fromKeys: string[]; toKeys: string[] } = {
      fromKeys: [],
      toKeys: [],
    };
    const builder = {
      select: () => builder,
      in: (col: string, values: string[]) => {
        if (col === "from_key") state.fromKeys = values;
        else if (col === "to_key") state.toKeys = values;
        // The final `in()` awaits the query — return a thenable that
        // resolves to the matching rows.
        const data: Array<Record<string, unknown>> = [];
        for (const r of cacheRows.values()) {
          if (
            state.fromKeys.includes(r.from_key as string) &&
            state.toKeys.includes(r.to_key as string)
          ) {
            data.push(r);
          }
        }
        return Promise.resolve({ data, error: null }) as unknown as typeof builder;
      },
      upsert: (rows: Array<Record<string, unknown>>) => {
        for (const row of rows) {
          cacheRows.set(`${row.from_key}::${row.to_key}`, row);
        }
        return {
          then: (resolve: (v: { data: null; error: null }) => void) =>
            resolve({ data: null, error: null }),
        };
      },
    };
    return builder;
  };
  return {
    supabaseAdmin: { from },
  };
});

const okOsrmResponse = () => ({
  ok: true,
  json: async () => ({
    code: "Ok",
    routes: [
      {
        distance: 12400, // 12.4 km
        duration: 14 * 60, // 14 min
        geometry: {
          coordinates: [
            [-9.14, 38.72],
            [-9.05, 38.51],
          ],
        },
      },
    ],
  }),
});

const stops = [
  { key: "lisbon", lat: 38.72, lng: -9.14 },
  { key: "arrabida", lat: 38.51, lng: -9.05 },
];

describe("resolveLegs — OSRM retry + cache", () => {
  beforeEach(() => {
    cacheRows.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries transient OSRM failures and returns an OSRM leg on eventual success", async () => {
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    const fetchMock = vi
      .fn()
      // First two attempts fail — network hiccup.
      .mockRejectedValueOnce(new Error("connect ETIMEDOUT"))
      .mockRejectedValueOnce(new Error("connect ECONNRESET"))
      // Third attempt succeeds.
      .mockResolvedValueOnce(okOsrmResponse());
    vi.stubGlobal("fetch", fetchMock);

    const promise = resolveLegs(stops);
    // Drain the exponential backoff waits (300ms → 900ms + jitter).
    await vi.advanceTimersByTimeAsync(2000);
    const legs = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(legs).toHaveLength(1);
    expect(legs[0].provider).toBe("osrm");
    expect(legs[0].distance_km).toBeCloseTo(12.4, 2);
    expect(legs[0].drive_minutes).toBe(14);
  });

  it("reads from cache on the second call for the same pair — no additional fetch", async () => {
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    const fetchMock = vi.fn().mockResolvedValue(okOsrmResponse());
    vi.stubGlobal("fetch", fetchMock);

    // First call populates the cache.
    const first = resolveLegs(stops);
    await vi.advanceTimersByTimeAsync(2000);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Fire-and-forget upsert runs on the microtask queue — flush it.
    await Promise.resolve();
    await Promise.resolve();

    // Second call should be a pure cache hit — fetch count unchanged.
    const second = resolveLegs(stops);
    await vi.advanceTimersByTimeAsync(10);
    const legs2 = await second;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(legs2[0].provider).toBe("osrm");
  });

  it("falls back to haversine (never throws) when every retry fails", async () => {
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = resolveLegs(stops);
    await vi.advanceTimersByTimeAsync(4000);
    const legs = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(legs).toHaveLength(1);
    expect(legs[0].provider).toBe("haversine");
    expect(legs[0].drive_minutes).toBeGreaterThan(0);
  });
});
