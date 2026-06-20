/**
 * Unit tests for the first-frame retry classifier.
 *
 * The hero film playback spec retries ONLY on near-miss budget
 * overruns ("jitter"). All other failures are hard regressions and
 * must fail fast. These tests pin that contract so a future tweak
 * to the classifier can't silently swallow a real regression.
 */
import { describe, it, expect } from "vitest";
import {
  FIRST_FRAME_JITTER_RATIO,
  isFirstFrameJitter,
  type FirstFrameProbeResult,
} from "../../e2e/hero-film-playback.helpers";

const BUDGET = 2000;
const JITTER_CEILING = BUDGET * FIRST_FRAME_JITTER_RATIO; // 3000

const ok = (ms = 100): FirstFrameProbeResult => ({
  ok: true,
  reason: "playing event",
  ms,
});

const fail = (reason: string, ms: number): FirstFrameProbeResult => ({
  ok: false,
  reason,
  ms,
});

describe("isFirstFrameJitter — success path", () => {
  it("returns false for any successful result (nothing to retry)", () => {
    expect(isFirstFrameJitter(ok(50), BUDGET)).toBe(false);
    expect(isFirstFrameJitter(ok(BUDGET - 1), BUDGET)).toBe(false);
    // Even an "ok" with ms above budget (shouldn't happen in practice
    // — the probe enforces the budget — but guards against future
    // refactors loosening that contract).
    expect(isFirstFrameJitter({ ...ok(BUDGET + 500) }, BUDGET)).toBe(false);
  });
});

describe("isFirstFrameJitter — jitter (retryable)", () => {
  it("retries near-miss overruns just past the budget", () => {
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", 2050), BUDGET)).toBe(true);
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", 2400), BUDGET)).toBe(true);
  });

  it("retries up to (but excluding) JITTER_RATIO × budget", () => {
    // Just under the ceiling — still jitter.
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", JITTER_CEILING - 1), BUDGET)).toBe(
      true,
    );
  });

  it("respects a custom jitter ratio override", () => {
    // ms=2400 with default ratio 1.5 → jitter; with ratio 1.1 (ceiling
    // 2200) → hard failure. Same input, different policy.
    const r = fail("budget exceeded (2000ms)", 2400);
    expect(isFirstFrameJitter(r, BUDGET, 1.5)).toBe(true);
    expect(isFirstFrameJitter(r, BUDGET, 1.1)).toBe(false);
  });
});

describe("isFirstFrameJitter — hard failures (NEVER retried)", () => {
  it("does not retry overruns at or above JITTER_RATIO × budget", () => {
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", JITTER_CEILING), BUDGET)).toBe(
      false,
    );
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", JITTER_CEILING + 1), BUDGET)).toBe(
      false,
    );
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", 5000), BUDGET)).toBe(false);
  });

  it("does not retry a missing video element", () => {
    expect(isFirstFrameJitter(fail("video element missing", -1), BUDGET)).toBe(false);
  });

  it("does not retry decoder errors", () => {
    expect(
      isFirstFrameJitter(
        fail('decoder error: code=4 msg="MEDIA_ERR_SRC_NOT_SUPPORTED"', -1),
        BUDGET,
      ),
    ).toBe(false);
    expect(
      isFirstFrameJitter(fail('decoder error: code=2 msg="MEDIA_ERR_NETWORK"', 800), BUDGET),
    ).toBe(false);
  });

  it("does not retry autoplay rejections", () => {
    expect(isFirstFrameJitter(fail("autoplay rejected: NotAllowedError", 50), BUDGET)).toBe(false);
  });

  it("does not retry an unrecognised reason (fail-closed)", () => {
    // A new failure mode not covered by the classifier MUST surface as
    // a hard failure rather than be silently retried away.
    expect(isFirstFrameJitter(fail("hydration race", 1500), BUDGET)).toBe(false);
    expect(isFirstFrameJitter(fail("", 1500), BUDGET)).toBe(false);
  });

  it("does not retry budget-exceeded with a non-positive ms (impossible measurement)", () => {
    // ms=0 / ms=-1 means we never started timing — treat as hard.
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", 0), BUDGET)).toBe(false);
    expect(isFirstFrameJitter(fail("budget exceeded (2000ms)", -1), BUDGET)).toBe(false);
  });
});

describe("FIRST_FRAME_JITTER_RATIO", () => {
  it("is exposed as 1.5 — pinned so the spec comment stays accurate", () => {
    expect(FIRST_FRAME_JITTER_RATIO).toBe(1.5);
  });
});
