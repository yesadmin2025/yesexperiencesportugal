/**
 * Final-pass polish contracts.
 *
 * These lock the *intelligence* behaviours that are easy to silently regress:
 * beat copy must paraphrase rather than parrot the tapped option label,
 * anticipation must live inside the reaction beat (NextTeaser stays silent),
 * delegated authorship must be named once with a reversible way back, and the
 * unified Your Day surface must not print each stop's story twice.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { delegatedChoiceSummary } from "../studioDelegation";
import type { StudioV3State } from "../types";
import { DEFAULT_STATE } from "../types";

const src = (f: string) => readFileSync(join(process.cwd(), "src/components/studio-v3", f), "utf8");

describe("reaction copy paraphrases instead of parroting", () => {
  const studio = src("StudioV3.tsx");

  it("uses dedicated paraphrase helpers for feeling / destination / investment", () => {
    expect(studio).toContain("function feelingCaptionLine(");
    expect(studio).toContain("function destinationReactionMessage(");
    expect(studio).toContain("function investmentReactionLine(");
    expect(studio).toContain("postcardCaption: feelingCaptionLine(id)");
    expect(studio).toContain("const message = destinationReactionMessage(id);");
    expect(studio).toContain("investmentReactionLine(id)");
  });

  it("keeps anticipation inside the beat and NextTeaser silent", () => {
    expect(studio).toContain("contextPhase?: StudioV3Phase");
    expect(studio).toContain("contextualTeaser(r.contextPhase, s)");
    expect(studio).toContain('data-testid="studio-v3-reaction-context"');
    expect(src("NextTeaser.tsx")).toContain("return null");
  });
});

describe("unified Your Day does not repeat each stop's story", () => {
  it("gates the editable stop prose while the inline reveal is mounted", () => {
    expect(src("StudioV3.tsx")).toContain("{s.story && !storySlot ? (");
  });
});

describe("delegated authorship is named once and reversible", () => {
  const base: StudioV3State = {
    ...DEFAULT_STATE,
    feeling: "coastal",
    companions: "couple",
    delegationMode: "yes-designs",
    decidedForMe: ["interests", "rhythm"],
    interests: ["ocean-view"],
    rhythm: "slow",
  } as StudioV3State;

  it("returns null when delegation is not active", () => {
    expect(delegatedChoiceSummary({ ...base, delegationMode: null } as StudioV3State)).toBeNull();
  });

  it("names the delegated taste and points back at the delegated phase", () => {
    const summary = delegatedChoiceSummary(base);
    expect(summary).not.toBeNull();
    expect(summary!.line.startsWith("Chosen for you —")).toBe(true);
    expect(summary!.adjustPhase).toBe("interests");
    expect(summary!.adjustLabel.length).toBeGreaterThan(0);
  });

  it("falls back to the rhythm phase when only the pace was delegated", () => {
    const summary = delegatedChoiceSummary({
      ...base,
      decidedForMe: ["rhythm"],
    } as StudioV3State);
    expect(summary?.adjustPhase).toBe("rhythm");
  });

  it("renders one 44px Adjust action, never a second primary CTA", () => {
    const read = src("DirectorsRead.tsx");
    expect(read).toContain('data-testid="studio-v3-delegation-adjust"');
    expect(read).toContain("min-h-[44px]");
    expect(read.match(/data-testid="studio-v3-delegation-adjust"/g)?.length).toBe(1);
  });
});

describe("checkout recap offers localized edits without inventing navigation", () => {
  const checkout = src("CheckoutSummary.tsx");

  it("exposes date / guests / stops edits with 44px targets", () => {
    expect(checkout).toContain('data-testid="studio-v3-checkout-summary-edit-date"');
    expect(checkout).toContain('data-testid="studio-v3-checkout-summary-edit-guests"');
    expect(checkout).toContain('data-testid="studio-v3-checkout-summary-edit-stops"');
    expect(checkout).toContain("min-h-[44px]");
  });

  it("only renders the stops edit when the host supplies a real callback", () => {
    expect(checkout).toContain("onEditStops ? (");
    expect(checkout).toContain("readonly onEditStops?: () => void;");
    expect(src("StudioV3.tsx")).toContain('onEditStops={() => back("storyboard")}');
  });
});
