/**
 * Studio V3 — P7 "Director's Read".
 *
 * The read must feel like a human travel director, which means three things
 * are non-negotiable: it is deterministic, it never dumps the option labels
 * back at the traveller, and it never invents a fact. It also has to keep the
 * P6 acknowledgement ledger honest, so nothing it says is repeated later.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DirectorsRead } from "../DirectorsRead";
import { composeDirectorsRead, type DirectorsReadState } from "../directorsRead";
import {
  acknowledgementSignalsFor,
  themesAcknowledgedBefore,
  type AcknowledgementContext,
} from "../studioAcknowledgement";
import { COMPANIONS, FEELINGS, INTERESTS, RHYTHMS } from "../types";

const coastalCouple: DirectorsReadState = {
  feeling: "coastal",
  companions: "couple",
  interests: ["gastronomy", "local-life"],
  rhythm: "slow",
};

function copyOf(state: DirectorsReadState): string {
  const read = composeDirectorsRead(state);
  return [read.headline, ...read.body].join(" ");
}

describe("composeDirectorsRead — determinism", () => {
  it("produces identical copy for identical state", () => {
    const a = composeDirectorsRead(coastalCouple);
    const b = composeDirectorsRead({ ...coastalCouple, interests: ["gastronomy", "local-life"] });
    expect(a.headline).toBe(b.headline);
    expect(a.body).toEqual(b.body);
    expect(a.signature).toBe(b.signature);
  });

  it("does not mutate the state it reads", () => {
    const interests = ["gastronomy", "local-life"] as const;
    const state = { ...coastalCouple, interests: [...interests] };
    const snapshot = JSON.stringify(state);
    composeDirectorsRead(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("recomputes when a meaningful answer changes (back-navigation)", () => {
    const before = composeDirectorsRead(coastalCouple);
    const after = composeDirectorsRead({ ...coastalCouple, rhythm: "immersive" });
    expect(after.signature).not.toBe(before.signature);
    expect(after.body).not.toEqual(before.body);
  });
});

describe("composeDirectorsRead — meaningfully different reads", () => {
  const feelings = ["coastal", "wine-food", "faith", "hands-on"] as const;

  it("writes a distinct read for each feeling", () => {
    const copies = feelings.map((feeling) => copyOf({ ...coastalCouple, feeling }));
    expect(new Set(copies).size).toBe(feelings.length);
  });

  it("writes a distinct read for slow vs full rhythm", () => {
    expect(copyOf({ ...coastalCouple, rhythm: "slow" })).not.toBe(
      copyOf({ ...coastalCouple, rhythm: "full" }),
    );
  });

  it("writes a distinct read for different company", () => {
    expect(copyOf({ ...coastalCouple, companions: "family" })).not.toBe(
      copyOf({ ...coastalCouple, companions: "couple" }),
    );
  });
});

describe("composeDirectorsRead — never a label dump", () => {
  const allLabels = [...FEELINGS, ...COMPANIONS, ...RHYTHMS, ...INTERESTS].map((o) => o.label);

  it("never echoes a visible option label verbatim", () => {
    for (const feeling of FEELINGS) {
      for (const rhythm of RHYTHMS) {
        const copy = copyOf({
          feeling: feeling.id,
          companions: "couple",
          interests: ["gastronomy", "photography", "wellness"],
          rhythm: rhythm.id,
        });
        for (const label of allLabels) {
          expect(copy).not.toContain(label);
        }
      }
    }
  });

  it("never renders a middot-joined summary and always reads as sentences", () => {
    const read = composeDirectorsRead(coastalCouple);
    expect(read.body.join(" ")).not.toContain("·");
    for (const line of read.body) {
      expect(line.trim().endsWith(".")).toBe(true);
      expect(line.length).toBeLessThan(180);
    }
    expect(read.body.length).toBeGreaterThanOrEqual(2);
    expect(read.body.length).toBeLessThanOrEqual(3);
  });
});

describe("composeDirectorsRead — inherited intent woven, not repeated", () => {
  it("does not list an interest the feeling already carries", () => {
    // `coastal` inherits the coast interest (P5), so the read must not add a
    // separate shoreline clause on top of the coastal atmosphere sentence.
    const read = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["coast"],
      rhythm: "slow",
    });
    const taste = read.body.filter((l) => l.startsWith("There should be room for"));
    expect(taste).toHaveLength(0);
    // The theme is still acknowledged — it was voiced by the feeling sentence.
    expect(read.themes).toContain("theme.coast");
  });

  it("still voices interests the feeling does not cover", () => {
    const read = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["coast", "wine"],
      rhythm: "slow",
    });
    expect(read.body.some((l) => l.startsWith("There should be room for"))).toBe(true);
    expect(read.themes).toContain("theme.wine");
  });
});

describe("composeDirectorsRead — safe neutral bridge", () => {
  it("returns a short neutral bridge with no invented detail", () => {
    const read = composeDirectorsRead({});
    expect(read.neutral).toBe(true);
    expect(read.body).toHaveLength(1);
    expect(read.themes).toEqual([]);
    expect(read.headline).toBe("Let me read this back to you.");
  });

  it("is not neutral as soon as one real signal exists", () => {
    expect(composeDirectorsRead({ rhythm: "slow" }).neutral).toBe(false);
  });
});

describe("P6 ledger — the read counts as an acknowledgement", () => {
  const state = { feeling: "coastal", interests: ["wine"], rhythm: "slow" } as const;

  function ctx(shown: boolean): AcknowledgementContext {
    const read = composeDirectorsRead({ ...state, companions: "couple" });
    return {
      state: { feeling: state.feeling, interests: [...state.interests], rhythm: state.rhythm },
      refinementShown: false,
      directorsRead: { shown, themes: read.themes },
    };
  }

  it("suppresses downstream repeats of what the read already said", () => {
    const withRead = acknowledgementSignalsFor("logistics", ctx(true));
    const withoutRead = acknowledgementSignalsFor("logistics", ctx(false));
    expect(withRead.length).toBeLessThan(withoutRead.length);
    for (const theme of composeDirectorsRead({ ...state, companions: "couple" }).themes) {
      expect(themesAcknowledgedBefore("logistics", ctx(true)).has(theme)).toBe(true);
    }
  });

  it("leaves P6 behaviour untouched when the read was never shown", () => {
    const legacy: AcknowledgementContext = {
      state: { feeling: state.feeling, interests: [...state.interests], rhythm: state.rhythm },
      refinementShown: false,
    };
    expect(acknowledgementSignalsFor("logistics", legacy)).toEqual(
      acknowledgementSignalsFor("logistics", ctx(false)),
    );
  });
});

describe("DirectorsRead — presentation", () => {
  it("renders eyebrow, headline and body with an accessible continue action", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const read = composeDirectorsRead(coastalCouple);
    render(<DirectorsRead read={read} onContinue={onContinue} />);

    expect(screen.getByTestId("studio-v3-directors-read")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(read.headline);

    const cta = screen.getByTestId("studio-v3-directors-read-continue");
    expect(cta).toBeEnabled();
    // Keyboard reachable and tappable in one action — never a forced wait.
    cta.focus();
    expect(document.activeElement).toBe(cta);
    await user.click(cta);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders no list markup — this is prose, not a dashboard", () => {
    render(<DirectorsRead read={composeDirectorsRead(coastalCouple)} onContinue={() => {}} />);
    expect(screen.queryAllByRole("list")).toHaveLength(0);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("fires the view callback once per read, not on every re-render", () => {
    const onView = vi.fn();
    const read = composeDirectorsRead(coastalCouple);
    const { rerender } = render(
      <DirectorsRead read={read} onContinue={() => {}} onView={onView} />,
    );
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(1);

    const changed = composeDirectorsRead({ ...coastalCouple, rhythm: "full" });
    rerender(<DirectorsRead read={changed} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(2);
  });
});
