import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { gate } = vi.hoisted(() => ({ gate: vi.fn() }));
vi.mock("@/lib/aiGate.server", () => ({ aiCallAllowed: gate }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

import { generateRevealStory } from "@/lib/driftEngine.server";
import { composeDay } from "@/lib/drift/composer";

const profile = { pickup: "lisbon", radius: "far", style: "wine", energy: "slow" } as const;
const input = {
  profile,
  day: composeDay(profile, "arrabida", { weekday: 2, month: 6 }),
  voice: {},
  regionLabel: "Arrábida",
  hints: { locale: "en" } as const,
};

describe("Drift story spending authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    gate.mockReset();
    vi.stubEnv("LOVABLE_API_KEY", "test-only-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
  });

  it("does not spend credits when the server-owned allowance is denied", async () => {
    gate.mockResolvedValue(false);
    expect(input.day.stops.length).toBeGreaterThan(0);
    const story = await generateRevealStory(input);
    expect(gate).toHaveBeenCalledExactlyOnceWith("drift_reveal");
    expect(fetch).not.toHaveBeenCalled();
    expect(story.source).toBe("fallback");
  });

  it("fails closed if the spending check fails", async () => {
    gate.mockRejectedValue(new Error("Allowance unavailable"));
    expect((await generateRevealStory(input)).source).toBe("fallback");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the public reveal without spending when the session limit denies AI", async () => {
    const story = await generateRevealStory({ ...input, hints: { locale: "en", skipAi: true } });
    expect(story.source).toBe("fallback");
    expect(gate).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the metered service only after server authorization", async () => {
    gate.mockResolvedValue(true);
    await generateRevealStory(input);
    expect(gate).toHaveBeenCalledExactlyOnceWith("drift_reveal");
    expect(fetch).toHaveBeenCalledTimes(1);
    const gateOrder = gate.mock.invocationCallOrder[0];
    const fetchOrder = vi.mocked(fetch).mock.invocationCallOrder[0];
    expect(gateOrder).toBeDefined();
    expect(fetchOrder).toBeDefined();
    if (gateOrder === undefined || fetchOrder === undefined) throw new Error("Missing calls");
    expect(gateOrder).toBeLessThan(fetchOrder);
  });
});