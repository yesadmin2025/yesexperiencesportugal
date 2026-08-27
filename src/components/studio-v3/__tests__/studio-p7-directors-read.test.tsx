/**
 * Studio V3 — P7 "Director's Read".
 *
 * The read must feel like a human travel director, which means three things
 * are non-negotiable: it is deterministic, it never dumps the option labels
 * back at the traveller, and it never invents a fact. It also has to keep the
 * P6 acknowledgement ledger honest, so nothing it says is repeated later.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DirectorsRead } from "../DirectorsRead";
import {
  composeDirectorsRead,
  directorsReadBackTarget,
  type DirectorsReadState,
} from "../directorsRead";
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

  it("recomputes when a meaningful interpreted answer changes (back-navigation)", () => {
    const before = composeDirectorsRead(coastalCouple);
    const after = composeDirectorsRead({ ...coastalCouple, companions: "family" });
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

  it("does not replay the Director when only rhythm changes", () => {
    const slow = composeDirectorsRead({ ...coastalCouple, rhythm: "slow" });
    const full = composeDirectorsRead({ ...coastalCouple, rhythm: "full" });
    expect(full.headline).toBe(slow.headline);
    expect(full.body).toEqual(slow.body);
    expect(full.signature).toBe(slow.signature);
    expect(full.themes).not.toContain("pace.rhythm");
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
    expect(read.body.length).toBeGreaterThanOrEqual(1);
    expect(read.body.length).toBeLessThanOrEqual(2);
  });
});

describe("composeDirectorsRead — inherited intent woven, not repeated", () => {
  it("does not narrate a feeling theme that Interests already acknowledged", () => {
    const read = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["coast"],
      rhythm: "slow",
    });
    const copy = [read.headline, ...read.body].join(" ");
    const taste = read.body.filter((l) => l.startsWith("There should be room for"));

    expect(taste).toHaveLength(0);
    expect(copy).not.toMatch(/Atlantic|shoreline/i);
    expect(copy).not.toMatch(/rushed|fewer places|longer in each/i);
    expect(read.themes).not.toContain("theme.coast");
    expect(read.themes).not.toContain("pace.rhythm");
    expect(read.body).toContain("This is for the two of you.");
  });

  it("does the same semantic de-duplication for wine, faith and hands-on", () => {
    const cases = [
      { feeling: "wine-food" as const, theme: "theme.wine", echo: /wine|table/i },
      { feeling: "faith" as const, theme: "theme.faith", echo: /stillness|pause|reflect/i },
      { feeling: "hands-on" as const, theme: "activity.hands-on", echo: /hands|made by hand/i },
    ];

    for (const c of cases) {
      const read = composeDirectorsRead({
        feeling: c.feeling,
        companions: "couple",
        interests: [],
        rhythm: "slow",
      });
      const copy = [read.headline, ...read.body].join(" ");
      expect(copy).not.toMatch(c.echo);
      expect(read.themes).not.toContain(c.theme);
      expect(read.themes).not.toContain("pace.rhythm");
      expect(read.body).toContain("This is for the two of you.");
    }
  });

  it("still voices interests the feeling does not cover", () => {
    const read = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["coast", "wine"],
      rhythm: "slow",
    });
    expect(read.body.some((l) => l.startsWith("There should be room for"))).toBe(true);
    expect(read.body.some((l) => l.includes("wine with room to linger"))).toBe(true);
    expect(read.themes).toContain("theme.wine");
    expect(read.themes).not.toContain("theme.coast");
    expect(read.themes).not.toContain("pace.rhythm");
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

  it("does not manufacture a second interpretation from rhythm alone", () => {
    const read = composeDirectorsRead({ rhythm: "slow" });
    expect(read.neutral).toBe(true);
    expect(read.themes).toEqual([]);
    expect(read.body).toHaveLength(1);
  });

  it("is not neutral as soon as one interpreted signal exists", () => {
    expect(composeDirectorsRead({ companions: "couple" }).neutral).toBe(false);
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
  it("renders eyebrow, headline and body with an accessible continue action", () => {
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
    fireEvent.click(cta);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders no list markup — this is prose, not a dashboard", () => {
    render(<DirectorsRead read={composeDirectorsRead(coastalCouple)} onContinue={() => {}} />);
    expect(screen.queryAllByRole("list")).toHaveLength(0);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("fires the view callback once per real read, not for rhythm-only replay", () => {
    const onView = vi.fn();
    const read = composeDirectorsRead(coastalCouple);
    const { rerender } = render(
      <DirectorsRead read={read} onContinue={() => {}} onView={onView} />,
    );
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(1);

    const rhythmOnly = composeDirectorsRead({ ...coastalCouple, rhythm: "full" });
    rerender(<DirectorsRead read={rhythmOnly} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(1);

    const changed = composeDirectorsRead({ ...coastalCouple, companions: "family" });
    rerender(<DirectorsRead read={changed} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(2);
  });
});

describe("composeDirectorsRead — wine intent stays intent-only", () => {
  const forbidden = [
    "cellar",
    "winery",
    "vineyard",
    "estate",
    "quinta",
    "tasting room",
    "Douro",
    "Alentejo",
    "Setúbal",
    "Azeitão",
    "Lisbon",
  ];

  it("never promises a stop, supplier, setting or region for wine", () => {
    for (const rhythm of RHYTHMS) {
      const copy = copyOf({
        feeling: "wine-food",
        companions: "couple",
        interests: ["wine", "gastronomy"],
        rhythm: rhythm.id,
      }).toLowerCase();
      for (const word of forbidden) {
        expect(copy).not.toContain(word.toLowerCase());
      }
    }
  });

  it("still voices the wine intent when the feeling does not carry it", () => {
    const read = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["wine"],
      rhythm: "slow",
    });
    expect(read.body.some((l) => l.includes("wine with room to linger"))).toBe(true);
  });
});

describe("directorsReadBackTarget", () => {
  it("returns to refinement when an adaptive question was shown", () => {
    expect(directorsReadBackTarget(true)).toBe("refinement");
  });

  it("returns to rhythm when no adaptive question exists", () => {
    expect(directorsReadBackTarget(false)).toBe("rhythm");
  });
});
