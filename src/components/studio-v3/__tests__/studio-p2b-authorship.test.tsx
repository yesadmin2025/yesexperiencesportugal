/**
 * Studio V3 — Pass 2B (reveal/refinement authorship inside "Your Day").
 *
 * Proves the authorship contract without touching curation scoring,
 * RHYTHM_STOP_COUNT, route authority, pricing or checkout.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import {
  applyGesture,
  describeStructuralDelta,
  genericiseWineryText,
  resolveMomentReason,
  type AuthoredStop,
} from "../momentAuthorship";
import { RefineStopCard } from "../RefineStopCard";
import { buildWineryDisplayLabels, studioDisplayLabel } from "../studioWineryPresentation";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);
const AUTHORSHIP_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/momentAuthorship.ts"),
  "utf8",
);

const stops = (labels: string[]): AuthoredStop[] =>
  labels.map((label) => ({ label, story: `${label} story` }));

describe("Pass 2B · refinement lives inside Your Day", () => {
  it("the stops editor is wrapped in the shared RefineAccordion + RefineStopCard", () => {
    expect(STUDIO_SRC).toContain('import { RefineAccordion } from "./RefineAccordion"');
    expect(STUDIO_SRC).toContain('import { RefineStopCard } from "./RefineStopCard"');
    const editor = STUDIO_SRC.indexOf('data-testid="studio-v3-stops-editor"');
    const accordion = STUDIO_SRC.indexOf("<RefineAccordion", editor);
    const card = STUDIO_SRC.indexOf("<RefineStopCard", editor);
    expect(editor).toBeGreaterThan(-1);
    expect(accordion).toBeGreaterThan(editor);
    expect(card).toBeGreaterThan(accordion);
    // No second refinement system: the old hand-rolled row markup is gone.
    expect(STUDIO_SRC).not.toContain('data-testid="studio-v3-refine-earlier-inline"');
  });

  it("every gesture routes through one authority with a single-step undo", () => {
    for (const handler of ["onMoveEarlier", "onMoveLater", "onRemove", "onPickSwap"]) {
      const at = STUDIO_SRC.indexOf(handler);
      expect(at, handler).toBeGreaterThan(-1);
    }
    expect(STUDIO_SRC).toContain("applyAuthoredChange");
    expect(STUDIO_SRC).toContain("setUndoSnapshot({ stops: before, summary: chip })");
  });
});

describe("Pass 2B · pure gestures + exact undo", () => {
  const base = stops(["A", "B", "C", "D", "E"]);

  it("swap replaces identity in place and undo restores the exact prior route", () => {
    const next = applyGesture(base, 2, "swap", {
      replacement: { label: "Z", story: "Z story" },
    });
    expect(next.map((s) => s.label)).toEqual(["A", "B", "Z", "D", "E"]);
    // undo = the snapshot taken before the change
    expect(base.map((s) => s.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(next[2].story).toBe("Z story");
  });

  it("move earlier / later changes order only and is reversible", () => {
    const earlier = applyGesture(base, 3, "earlier");
    expect(earlier.map((s) => s.label)).toEqual(["A", "B", "D", "C", "E"]);
    expect(applyGesture(earlier, 2, "later").map((s) => s.label)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    // boundaries are inert
    expect(applyGesture(base, 0, "earlier").map((s) => s.label)).toEqual(
      base.map((s) => s.label),
    );
    expect(applyGesture(base, 4, "later").map((s) => s.label)).toEqual(base.map((s) => s.label));
  });

  it("remove obeys the existing minimum and never mutates the input", () => {
    const short = stops(["A", "B", "C"]);
    expect(applyGesture(short, 1, "remove", { minStops: 3 }).map((s) => s.label)).toEqual([
      "A",
      "B",
      "C",
    ]);
    const removed = applyGesture(base, 1, "remove", { minStops: 3 });
    expect(removed.map((s) => s.label)).toEqual(["A", "C", "D", "E"]);
    expect(base.map((s) => s.label)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("swap without a real replacement candidate is a no-op", () => {
    expect(applyGesture(base, 1, "swap", { replacement: null }).map((s) => s.label)).toEqual(
      base.map((s) => s.label),
    );
  });

  it("structural delta copy is structural only", () => {
    expect(describeStructuralDelta("swap")).toBe("Moment swapped");
    expect(describeStructuralDelta("earlier")).toBe("Moved earlier");
    expect(describeStructuralDelta("later")).toBe("Moved later");
    expect(describeStructuralDelta("remove")).toBe("1 moment removed");
  });
});

describe("Pass 2B · truthful reasons only", () => {
  it("returns null when no selected signal justifies the moment", () => {
    expect(resolveMomentReason("Quinta do Piloto", { interests: [], feeling: null })).toBeNull();
    expect(resolveMomentReason("Not A Real Stop At All", { interests: ["wine"] })).toBeNull();
  });

  it("returns one short reason when the signal was really selected", () => {
    const reason = resolveMomentReason("Quinta do Piloto", { interests: ["wine"] });
    expect(reason).toBe("Because you chose wine.");
    expect(reason!.length).toBeLessThan(48);
  });

  it("derives only from real catalog metadata and selected signals", () => {
    expect(AUTHORSHIP_SRC).toContain("lookupStopGeo");
    expect(AUTHORSHIP_SRC).not.toMatch(/priceFrom|RHYTHM_STOP_COUNT|stripe/i);
  });
});

describe("Pass 2B · winery supplier names stay generic", () => {
  const canonical = ["Quinta do Piloto", "José Maria da Fonseca"];
  const labels = buildWineryDisplayLabels(canonical.map((label) => ({ label })));

  it("generic labels are used for moments and swap candidates", () => {
    for (const label of canonical) {
      const generic = studioDisplayLabel(label, labels);
      expect(generic).not.toContain(label);
      expect(generic.toLowerCase()).toContain("winery");
    }
  });

  it("feedback and reason text cannot leak a supplier name", () => {
    const leak = "Quinta do Piloto replaces José Maria da Fonseca";
    const safe = genericiseWineryText(leak, labels);
    for (const label of canonical) expect(safe).not.toContain(label);
  });

  it("the storyboard genericises moment labels, swap pool and delta feedback", () => {
    expect(STUDIO_SRC).toContain("const swapPoolPublic = swapPool.map(");
    expect(STUDIO_SRC).toContain("label: authorLabel(c.label)");
    expect(STUDIO_SRC).toContain("story: authorText(c.story ?? \"\")");
    expect(STUDIO_SRC).toContain("{authorText(intentFeedback)}");
    expect(STUDIO_SRC).toContain("label={authorLabel(s.label)}");
  });
});

describe("Pass 2B · swap pool stays inside the real curated pool", () => {
  it("candidates come only from the resolved skeleton + validated replacements", () => {
    expect(STUDIO_SRC).toContain("selectReplacementCandidates");
    // the card is fed from swapPoolPublic, which is derived from swapPool only
    expect(STUDIO_SRC).toContain("swapPool={swapPoolPublic}");
    expect(STUDIO_SRC).toContain("const canonical = swapPool.find((c) => c.label === cand.id)");
    expect(STUDIO_SRC).toContain("if (!canonical) return;");
  });
});

describe("Pass 2B · route authority and pricing untouched", () => {
  it("the authored full route stays the single authority", () => {
    expect(STUDIO_SRC).toContain("const editedStops = state.editedRoutePoints ?? baseStops");
    expect(STUDIO_SRC).toContain("editedStops.map((s, i) => (");
    // no compact 4-slot projection sneaks into the editor
    const editor = STUDIO_SRC.indexOf('data-testid="studio-v3-stops-editor"');
    const segment = STUDIO_SRC.slice(editor, editor + 4000);
    expect(segment).not.toContain("slice(0, 4)");
  });

  it("Pass 2B code carries no pricing or rhythm constants", () => {
    expect(AUTHORSHIP_SRC).not.toContain("RHYTHM_STOP_COUNT");
    expect(AUTHORSHIP_SRC).not.toMatch(/eur|€/i);
  });
});

describe("Pass 2B · accessible authorship affordances", () => {
  it("renders reason, 44px actions and a real swap pool", () => {
    const onSwap = vi.fn();
    render(
      <ol>
        <RefineStopCard
          index={1}
          total={3}
          label="A local winery"
          reason="Because you chose wine."
          canSwap
          swapOpen
          swapPool={[{ id: "Quinta do Piloto", label: "A second local winery" }]}
          onToggleSwap={() => {}}
          onPickSwap={onSwap}
          onMoveEarlier={() => {}}
          onMoveLater={() => {}}
          onRemove={() => {}}
        />
      </ol>,
    );
    const card = screen.getByTestId("studio-v3-refine-stop-card");
    expect(within(card).getByTestId("studio-v3-moment-reason").textContent).toBe(
      "Because you chose wine.",
    );
    for (const id of [
      "studio-v3-refine-earlier",
      "studio-v3-refine-later",
      "studio-v3-refine-swap",
      "studio-v3-refine-remove",
    ]) {
      expect(screen.getByTestId(id).className).toMatch(/min-h-\[44px\]/);
    }
    fireEvent.click(within(card).getByText("A second local winery"));
    expect(onSwap).toHaveBeenCalledWith(
      expect.objectContaining({ id: "Quinta do Piloto", label: "A second local winery" }),
    );
    expect(card.textContent).not.toContain("Quinta do Piloto");
  });
});
