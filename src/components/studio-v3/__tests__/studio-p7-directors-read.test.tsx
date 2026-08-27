/**
 * Studio V3 — P7 "Director's Read".
 *
 * The read must feel like a human travel director, which means it connects
 * choices rather than reading them back. Reaction beats already acknowledge
 * Feeling, Who, Interests and Rhythm; this surface earns its place only by
 * adding an interpretation that was not already on screen.
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
    const b = composeDirectorsRead({ ...coastalCouple });
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

  it("recomputes when a choice that changes the interpretation changes", () => {
    const before = composeDirectorsRead(coastalCouple);
    const after = composeDirectorsRead({ ...coastalCouple, rhythm: "immersive" });
    expect(after.signature).not.toBe(before.signature);
    expect(after.body).not.toEqual(before.body);
  });

  it("does not interrupt again for an interest-only back-edit", () => {
    const before = composeDirectorsRead(coastalCouple);
    const after = composeDirectorsRead({
      ...coastalCouple,
      interests: ["wine", "photography", "wellness"],
    });
    expect(after.signature).toBe(before.signature);
    expect(after.headline).toBe(before.headline);
    expect(after.body).toEqual(before.body);
  });
});

describe("composeDirectorsRead — meaningfully different reads", () => {
  const feelings = ["coastal", "wine-food", "faith", "hands-on"] as const;

  it("writes a distinct editorial judgement for each feeling", () => {
    const copies = feelings.map((feeling) => copyOf({ ...coastalCouple, feeling }));
    expect(new Set(copies).size).toBe(feelings.length);
  });

  it("interprets slow vs full rhythm differently without replaying the labels", () => {
    expect(copyOf({ ...coastalCouple, rhythm: "slow" })).not.toBe(
      copyOf({ ...coastalCouple, rhythm: "full" }),
    );
  });

  it("interprets different company differently", () => {
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

describe("composeDirectorsRead — reaction beats are not narrated twice", () => {
  const reactionEchoCases: ReadonlyArray<{
    feeling: DirectorsReadState["feeling"];
    forbidden: RegExp;
  }> = [
    { feeling: "coastal", forbidden: /Atlantic|salt|cliffs|facing the sea/i },
    { feeling: "wine-food", forbidden: /wine|bottles|around the table/i },
    { feeling: "hidden", forbidden: /quiet roads|small doors|obvious/i },
    { feeling: "romance", forbidden: /soft light|space for two|two of you/i },
    { feeling: "culture", forbidden: /old stones|long stories|depth/i },
    { feeling: "adventure", forbidden: /open edges|open air|horizon|energy/i },
    { feeling: "slow-luxury", forbidden: /fewer stops|deeper moments|nothing rushed/i },
    { feeling: "faith", forbidden: /sanctuar|candlelight|silence|pause/i },
    { feeling: "hands-on", forbidden: /workshop|local hands|made with you|doing/i },
  ];

  it("uses Feeling only for editorial judgement, never a synonym-heavy replay", () => {
    for (const c of reactionEchoCases) {
      const copy = copyOf({
        feeling: c.feeling,
        companions: "couple",
        interests: [],
        rhythm: "slow",
      });
      expect(copy).not.toMatch(c.forbidden);
    }
  });

  it("does not repeat Interests because the Interests reaction already showed them", () => {
    const withoutInterests = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: [],
      rhythm: "slow",
    });
    const withInterests = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["wine", "local-life", "photography"],
      rhythm: "slow",
    });
    expect(withInterests.signature).toBe(withoutInterests.signature);
    expect(withInterests.body).toEqual(withoutInterests.body);
    expect(withInterests.headline).toBe(withoutInterests.headline);
  });

  it("turns Rhythm into an editing consequence, not another pace label", () => {
    const slow = copyOf({ ...coastalCouple, rhythm: "slow" });
    const full = copyOf({ ...coastalCouple, rhythm: "full" });
    expect(slow).not.toMatch(/slow|fewer stops|more time in place|unhurried/i);
    expect(full).not.toMatch(/full day|more discovery|richer arc/i);
    expect(slow).toContain("The edit matters more than the count");
    expect(full).toContain("The order will matter");
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

  it("marks the structural rhythm interpretation as heard", () => {
    const read = composeDirectorsRead({ ...state, companions: "couple" });
    expect(read.themes).toContain("pace.rhythm");
    expect(themesAcknowledgedBefore("logistics", ctx(true))).toContain("pace.rhythm");
  });

  it("keeps Logistics silent on taste/rhythm once the read has been shown", () => {
    expect(acknowledgementSignalsFor("logistics", ctx(true))).toEqual([]);
    expect(acknowledgementSignalsFor("logistics", ctx(false)).length).toBeGreaterThan(0);
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

  it("fires the view callback once per read, not on every re-render", () => {
    const onView = vi.fn();
    const read = composeDirectorsRead(coastalCouple);
    const { rerender } = render(
      <DirectorsRead read={read} onContinue={() => {}} onView={onView} />,
    );
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    rerender(<DirectorsRead read={read} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(1);

    const interestOnly = composeDirectorsRead({ ...coastalCouple, interests: ["wine"] });
    rerender(<DirectorsRead read={interestOnly} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(1);

    const changed = composeDirectorsRead({ ...coastalCouple, rhythm: "full" });
    rerender(<DirectorsRead read={changed} onContinue={() => {}} onView={onView} />);
    expect(onView).toHaveBeenCalledTimes(2);
  });
});

describe("composeDirectorsRead — wine stays intent-only and non-repetitive", () => {
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

  it("never promises a stop, supplier, setting or region", () => {
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

  it("does not repeat explicit wine after the Interests reaction", () => {
    const base = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: [],
      rhythm: "slow",
    });
    const wine = composeDirectorsRead({
      feeling: "coastal",
      companions: "couple",
      interests: ["wine"],
      rhythm: "slow",
    });
    expect(wine.signature).toBe(base.signature);
    expect(wine.body).toEqual(base.body);
    expect(wine.body.join(" ")).not.toMatch(/wine/i);
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
