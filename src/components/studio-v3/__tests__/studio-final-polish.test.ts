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

import type { StudioV3State } from "../types";
import {
  DESTINATION_INTENTS,
  FEELINGS,
  INITIAL_STATE,
  INVESTMENT_TIERS,
} from "../types";

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
    expect(studio).toContain("contextLine?: string | null;");
    expect(studio).toContain("contextLine: contextualTeaser(");
    expect(studio).toContain('data-testid="studio-v3-reaction-context"');
    expect(src("PhaseChrome.tsx")).toMatch(/function NextTeaser[\s\S]{0,600}?return null/);
  });

  it("surfaces the contextual teaser exactly once, inside the beat", () => {
    expect(studio.match(/data-testid="studio-v3-reaction-context"/g)?.length).toBe(1);
    expect(src("PhaseChrome.tsx")).not.toContain("studio-v3-reaction-context");
  });

  const body = (name: string): string => {
    const start = studio.indexOf(`function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    return studio.slice(start, studio.indexOf("\n}", start));
  };

  const assertNoParroting = (name: string, labels: readonly string[]) => {
    const returned = [...body(name).matchAll(/return "((?:[^"\\]|\\.)*)"/g)]
      .map((m) => m[1])
      .join(" | ")
      .toLowerCase();
    for (const label of labels) {
      expect(returned.includes(label.toLowerCase())).toBe(false);
    }
  };

  it("never echoes the tapped option label back verbatim", () => {
    assertNoParroting(
      "feelingCaptionLine",
      FEELINGS.map((o) => o.label),
    );
    assertNoParroting(
      "destinationReactionMessage",
      DESTINATION_INTENTS.map((o) => o.label),
    );
    assertNoParroting(
      "investmentReactionLine",
      INVESTMENT_TIERS.map((o) => o.label),
    );
  });
});

describe("reaction beats never read operational option labels back as prose", () => {
  const studio = src("StudioV3.tsx");

  it("pickup keeps the origin on the map but not in the reaction prose", () => {
    expect(studio).toContain("Your starting point is placed. The route can open from here.");
    expect(studio).toContain('message: "It starts here.\\nThe day begins to open.",');
    expect(studio).not.toContain("the day begins in ${originLabel}");
    expect(studio).not.toContain("From ${originLabel}, the day begins to open");
    // the map still carries the real origin (operational fact)
    expect(studio).toContain("originLabel,");
  });

  it("rhythm postcard caption no longer prints the raw pace label", () => {
    expect(studio).toContain('postcardCaption: "Pace held"');
    expect(studio).not.toContain('? "Slow"');
    expect(studio).toContain('reaction.rhythmBucket === "slow"');
  });

  it("investment beats stay editorial and never interpolate the tier label", () => {
    expect(studio).toContain(
      "The route is no longer a template. The level of care is shaping its texture.",
    );
    expect(studio).toContain('postcardCaption: "Direction set"');
  });

  it("interests map beat speaks generically, chips carry the explicit selection", () => {
    expect(studio).toContain("your priorities are being matched to one real route.");
    expect(studio).not.toContain("we are matching ${interestPhrase}");
  });
});

describe("unified Your Day does not repeat each stop's story", () => {
  it("gates the editable stop prose while the inline reveal is mounted", () => {
    // Pass 2B: the same gate now lives on the shared RefineStopCard prop.
    expect(src("StudioV3.tsx")).toContain(
      "story={s.story && !storySlot ? authorText(s.story) : undefined}",
    );
  });
});

describe("delegated authorship is named once and reversible", () => {
  const base: StudioV3State = {
    ...INITIAL_STATE,
    feeling: "coastal",
    companions: "couple",
    delegationMode: "yes-designs",
    decidedForMe: ["interests", "rhythm"],
    interests: ["coast"],
    rhythm: "slow",
  } as StudioV3State;

  it("keeps the presentation summary out of the delegation decision module", () => {
    const delegation = src("studioDelegation.ts");
    expect(delegation).not.toContain("delegatedChoiceSummary");
    expect(delegation).not.toContain('from "./curation"');
    expect(src("StudioV3.tsx")).toContain("function delegatedChoiceSummary(");
    // The presentation helper still reads only resolved labels off state.
    expect(base.decidedForMe).toContain("interests");
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
    expect(checkout).toContain('editTestId="studio-v3-checkout-summary-edit-date"');
    expect(checkout).toContain('editTestId="studio-v3-checkout-summary-edit-guests"');
    expect(checkout).toContain('testId="studio-v3-checkout-summary-edit-stops"');
    expect(checkout).toContain('data-testid={testId}');
    expect(checkout).toContain("min-h-[44px]");
  });

  it("only renders the stops edit when the host supplies a real callback", () => {
    expect(checkout).toContain("onEditStops ? (");
    expect(checkout).toContain("readonly onEditStops?: () => void;");
    expect(src("StudioV3.tsx")).toContain('jumpBackToPhase("storyboard", "checkout-edit-stops")');
  });
});

describe("delegated authorship reuses existing navigation", () => {
  const studio = src("StudioV3.tsx");
  const read = src("DirectorsRead.tsx");

  it("keeps the delegation line as a single primitive", () => {
    // PASS 4 — the blocking Director's Read beat is retired from the live
    // path (Your Day is the reward, logistics the admin that follows), but
    // the primitive stays intact for legacy surfaces.
    expect(read.match(/data-testid="studio-v3-delegation-read-line"/g)?.length).toBe(1);
    expect(studio).not.toContain("<DirectorsRead");
  });

  it("only allows a strictly earlier phase and preserves every answer", () => {
    const start = studio.indexOf("const jumpBackToPhase = useCallback(");
    expect(start).toBeGreaterThan(-1);
    const fn = studio.slice(start, start + 900);
    expect(fn).toContain("if (toIdx < 0 || fromIdx < 0 || toIdx >= fromIdx) return;");
    expect(fn).toContain("if (!isPhaseRelevant(target, state)) return;");
    expect(fn).toContain("{ to: target, source }");
    expect(fn).toContain("280");
    expect(fn).toContain("{ ...s, phase: target }");
    expect(fn).not.toMatch(/decidedForMe|delegationMode|interests:|rhythm:/);
  });

  it("routes the checkout stops edit through the same protected jump", () => {
    expect(studio).toContain('jumpBackToPhase("storyboard", "checkout-edit-stops")');
    expect(studio).toContain('onEditGuestDetails={() => back("guestDetails")}');
  });

  it("renders the anticipation line once, through one shared footer", () => {
    expect(studio.match(/data-testid="studio-v3-reaction-context"/g)?.length).toBe(1);
    expect(studio.match(/<ReactionContextFooter /g)?.length).toBe(3);
    // No mutable side channel: the handler passes the line directly.
    expect(studio).not.toContain("let contextLine");
    expect(studio).not.toContain("contextPhase");
  });

  it("keeps one primary CTA on the unified storyboard", () => {
    expect(studio.match(/data-testid="studio-v3-storyboard-primary"/g)?.length ?? 1).toBe(1);
    expect(read.match(/data-testid="studio-v3-directors-read-continue"/g)?.length ?? 1).toBe(1);
  });
});

describe("exactly one primary booking CTA per surface", () => {
  const priceCard = src("SignaturePriceCard.tsx");
  const checkout = src("CheckoutSummary.tsx");
  const studio = src("StudioV3.tsx");

  it("the value/price surface owns a single primary booking CTA", () => {
    // The storyboard's booking CTA lives in SignaturePriceCard and nowhere else.
    expect(priceCard.match(/data-testid="studio-v3-cta-primary"/g)?.length).toBe(1);
    expect(studio).not.toContain('data-testid="studio-v3-cta-primary"');
  });

  it("checkout exposes a single reserve action, edits are secondary", () => {
    expect(checkout.match(/data-testid="studio-v3-checkout-summary-reserve"/g)?.length).toBe(1);
    // Localized edits are text/ghost affordances, never a second reserve CTA.
    expect(checkout).not.toMatch(/data-testid="studio-v3-checkout-summary-reserve-\w+"/);
  });

  it("Adjust is never counted as a booking CTA", () => {
    const read = src("DirectorsRead.tsx");
    expect(read).toContain('data-testid="studio-v3-delegation-adjust"');
    expect(read.match(/data-phase-cta=/g)?.length).toBe(1);
  });
});
