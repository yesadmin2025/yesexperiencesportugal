import { describe, expect, it } from "vitest";

import {
  parseLivingAtlasPreviewState,
  serializeLivingAtlasPreviewState,
} from "../livingAtlasPreviewState";

const FUTURE_DATE = "2099-08-10";

describe("Living Atlas preview state", () => {
  it("round-trips a shaped day without storing personal data", () => {
    const raw = serializeLivingAtlasPreviewState({
      stage: "shape",
      pathMode: "discover",
      destinationIntent: "no-preference",
      selectedDate: FUTURE_DATE,
      selected: ["wine-table", "atlantic-coast", "local-life"],
      leads: ["wine-table", "atlantic-coast"],
      discoverySignal: "arrabida-family-wine",
      preferences: {
        density: "balanced",
        wineEmphasis: "one-winery",
        atlanticMode: "boat",
        localMoment: "market",
      },
      replacements: { "parque-natural-arrabida": "portinho-arrabida" },
    });
    const restored = parseLivingAtlasPreviewState(raw);

    expect(restored).toMatchObject({
      version: 1,
      stage: "shape",
      selectedDate: FUTURE_DATE,
      selected: ["wine-table", "atlantic-coast", "local-life"],
      leads: ["wine-table", "atlantic-coast"],
      replacements: { "parque-natural-arrabida": "portinho-arrabida" },
    });
    expect(raw).not.toContain("email");
    expect(raw).not.toContain("fullName");
  });

  it("sanitizes unknown dimensions, signals, preferences and replacement payloads", () => {
    const restored = parseLivingAtlasPreviewState(
      JSON.stringify({
        version: 1,
        stage: "shape",
        pathMode: "discover",
        destinationIntent: "invented-place",
        selectedDate: FUTURE_DATE,
        selected: ["wine-table", "not-real", "atlantic-coast", "local-life", "faith-reflection"],
        leads: ["not-real", "wine-table", "atlantic-coast", "local-life"],
        discoverySignal: "fabricated-signal",
        preferences: {
          density: "warp-speed",
          wineEmphasis: "all-wineries",
          atlanticMode: "submarine",
          localMoment: "shopping-centre",
        },
        replacements: {
          valid: "stop",
          tooLong: "x".repeat(130),
          invalid: 42,
        },
        updatedAt: "bad-date-is-still-inert-text",
      }),
    );

    expect(restored).toMatchObject({
      stage: "shape",
      selectedDate: FUTURE_DATE,
      destinationIntent: "no-preference",
      selected: ["wine-table", "atlantic-coast", "local-life"],
      leads: ["wine-table", "atlantic-coast"],
      discoverySignal: null,
      preferences: {
        density: "balanced",
        wineEmphasis: "one-winery",
        atlanticMode: "coast",
        localMoment: "market",
      },
      replacements: { valid: "stop" },
    });
  });

  it("returns to the date step when a saved result has no valid date", () => {
    const restored = parseLivingAtlasPreviewState(
      JSON.stringify({
        version: 1,
        stage: "shape",
        pathMode: "destination",
        destinationIntent: "spiritual-coast",
        selectedDate: "2020-01-01",
        selected: [],
        leads: [],
        discoverySignal: null,
        preferences: {},
        replacements: {},
        updatedAt: new Date().toISOString(),
      }),
    );

    expect(restored?.stage).toBe("date");
    expect(restored?.selectedDate).toBeNull();
  });

  it("ignores malformed storage instead of breaking the preview", () => {
    expect(parseLivingAtlasPreviewState("{not-json")).toBeNull();
    expect(parseLivingAtlasPreviewState(JSON.stringify({ version: 99 }))).toBeNull();
  });
});
