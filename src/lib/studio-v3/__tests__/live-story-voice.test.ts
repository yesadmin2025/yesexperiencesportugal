import { describe, expect, it } from "vitest";
import {
  containsRawStudioTaxonomy,
  deterministicLiveStoryFallback,
  sanitizeLiveStory,
} from "../liveStoryVoice";

describe("Studio live-story voice", () => {
  it("combines atmosphere, a distinct interest, company and pace instead of listing choices", () => {
    const text = deterministicLiveStoryFallback({
      feeling: "coastal",
      companions: "couple",
      interests: ["coast", "photography"],
      rhythm: "balanced",
    });

    expect(text).toContain("Atlantic");
    expect(text).toContain("pauses for the light");
    expect(text).toContain("two of you");
    expect(text).toContain("movement and pause");
    expect(text).not.toContain("coastal");
    expect(text).not.toContain("photography");
    expect(text.length).toBeLessThanOrEqual(220);
  });

  it("does not repeat an interest already implied by the feeling", () => {
    const text = deterministicLiveStoryFallback({
      feeling: "wine-food",
      companions: "friends",
      interests: ["wine", "gastronomy"],
      rhythm: "slow",
    });

    expect(text.match(/table/gi)?.length ?? 0).toBe(1);
    expect(text).toContain("conversation");
    expect(text).toContain("linger");
    expect(text).not.toContain("wine-food");
  });

  it("changes meaning when the profile changes while remaining deterministic", () => {
    const coastal = {
      firstName: "Maya",
      feeling: "coastal",
      companions: "couple",
      interests: ["photography"],
      rhythm: "balanced",
    } as const;
    const hidden = { ...coastal, feeling: "hidden", rhythm: "slow" } as const;

    expect(deterministicLiveStoryFallback(coastal)).toBe(deterministicLiveStoryFallback(coastal));
    expect(deterministicLiveStoryFallback(hidden)).not.toBe(
      deterministicLiveStoryFallback(coastal),
    );
    expect(deterministicLiveStoryFallback(coastal).match(/Maya/g)).toHaveLength(1);
  });

  it("sanitizes hype, emoji, exclamation marks and excessive length", () => {
    const raw = `Amazing! ✨ ${"A thoughtful private day ".repeat(20)}`;
    const text = sanitizeLiveStory(raw);

    expect(text).not.toMatch(/amazing/i);
    expect(text).not.toContain("!");
    expect(text).not.toContain("✨");
    expect(text.length).toBeLessThanOrEqual(220);
  });

  it("detects raw internal taxonomy tokens before model copy reaches the UI", () => {
    expect(containsRawStudioTaxonomy("A wine-food day with slow-luxury pacing.")).toBe(true);
    expect(containsRawStudioTaxonomy("The table matters, with enough room to linger.")).toBe(false);
  });
});
