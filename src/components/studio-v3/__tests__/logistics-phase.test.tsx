import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LogisticsPhase,
  PICKUP_GROUPS,
  defaultPickupForGroup,
  initialLogisticsMoment,
  pickupGroupOf,
  pickupReviewLabel,
} from "../LogisticsPhase";
import { PICKUPS, type Pickup, type StudioV3State } from "../types";

function baseState(overrides: Partial<StudioV3State> = {}): StudioV3State {
  return {
    phase: "logistics",
    feeling: "coastal",
    destinationIntent: "arrabida",
    companions: "couple",
    interests: ["coast"],
    rhythm: "slow",
    refinement: null,
    occasion: null,
    dateMode: null,
    dateExact: null,
    pickup: null,
    guests: 2,
    adults: 2,
    minorAges: [],
    guestsInferred: false,
    guestsPrivateEvent: false,
    language: null,
    investment: null,
    considerations: [],
    decidedForMe: [],
    firstName: null,
    ...(overrides as Partial<StudioV3State>),
  } as StudioV3State;
}

function renderPhase(state: StudioV3State, onCompose = vi.fn(), onBackPhase = vi.fn()) {
  let current = state;
  const rerenderRef = { current: undefined as undefined | ((s: StudioV3State) => void) };
  const setState = (updater: (s: StudioV3State) => StudioV3State) => {
    current = updater(current);
    rerenderRef.current?.(current);
  };
  const view = render(
    <LogisticsPhase
      state={current}
      setState={setState}
      onAdultsChange={vi.fn()}
      onAddMinor={vi.fn()}
      onRemoveMinor={vi.fn()}
      onMinorAgeChange={vi.fn()}
      onBackPhase={onBackPhase}
      onCompose={onCompose}
      acknowledgement={null}
    />,
  );
  rerenderRef.current = (s) =>
    view.rerender(
      <LogisticsPhase
        state={s}
        setState={setState}
        onAdultsChange={vi.fn()}
        onAddMinor={vi.fn()}
        onRemoveMinor={vi.fn()}
        onMinorAgeChange={vi.fn()}
        onBackPhase={onBackPhase}
        onCompose={onCompose}
        acknowledgement={null}
      />,
    );
  return {
    view,
    get state() {
      return current;
    },
  };
}

const moment = () =>
  screen.getByTestId("studio-v3-logistics").getAttribute("data-logistics-moment");
const cta = () => screen.getByTestId("studio-v3-logistics").parentElement!;

function clickContinue() {
  fireEvent.click(document.querySelector('button[data-phase-cta="continue"]')!);
}

describe("pickup taxonomy", () => {
  it("maps every visible group onto a real operational pickup id", () => {
    const operational = new Set(PICKUPS.map((p) => p.id as string));
    for (const group of PICKUP_GROUPS) {
      if (group.id === "lisbon") {
        expect(operational.has("lisbon")).toBe(true);
        continue;
      }
      expect(operational.has(group.id)).toBe(true);
    }
  });

  it("keeps airport and cruise pickups available as Lisbon refinements", () => {
    const operational = new Set(PICKUPS.map((p) => p.id as string));
    expect(operational.has("lisbon-airport")).toBe(true);
    expect(operational.has("lisbon-cruise")).toBe(true);
    expect(pickupGroupOf("lisbon-airport")).toBe("lisbon");
    expect(pickupGroupOf("lisbon-cruise")).toBe("lisbon");
  });

  it("never downgrades a saved airport/cruise choice when Lisbon is re-picked", () => {
    expect(defaultPickupForGroup("lisbon", "lisbon-cruise")).toBe("lisbon-cruise");
    expect(defaultPickupForGroup("lisbon", null)).toBe("lisbon");
    expect(defaultPickupForGroup("sintra", "lisbon-cruise")).toBe("sintra");
  });

  it("labels arrival pickups explicitly in review", () => {
    expect(pickupReviewLabel("lisbon-airport")).toBe("Lisbon airport");
    expect(pickupReviewLabel("lisbon-cruise")).toBe("Lisbon cruise terminal");
    expect(pickupReviewLabel("sintra")).toBe("Sintra");
  });
});

describe("initialLogisticsMoment", () => {
  it("opens on When for a fresh state", () => {
    expect(initialLogisticsMoment(baseState())).toBe("when");
  });
  it("opens on Where when only the date is known", () => {
    expect(initialLogisticsMoment(baseState({ dateMode: "flexible" }))).toBe("where");
  });
  it("opens on review for a fully hydrated state", () => {
    expect(
      initialLogisticsMoment(baseState({ dateMode: "flexible", pickup: "lisbon" as Pickup })),
    ).toBe("review");
  });
});

describe("progressive disclosure", () => {
  it("asks one thing at a time and only composes from review", () => {
    const onCompose = vi.fn();
    renderPhase(baseState(), onCompose);

    expect(moment()).toBe("when");
    expect(screen.queryByLabelText("Where the day begins")).toBeNull();
    expect(screen.queryByLabelText("Your party")).toBeNull();

    fireEvent.click(document.querySelectorAll('button[data-phase-cta="date-secondary"]')[0]!);
    clickContinue();
    expect(moment()).toBe("where");

    fireEvent.click(screen.getAllByTestId("studio-v3-choice")[0]!);
    clickContinue();
    expect(moment()).toBe("who");
    expect(onCompose).not.toHaveBeenCalled();

    clickContinue();
    expect(moment()).toBe("review");
    expect(screen.getAllByTestId("studio-v3-logistics-review-row")).toHaveLength(3);

    clickContinue();
    expect(onCompose).toHaveBeenCalledTimes(1);
  });

  it("blocks continue until the current moment is answered", () => {
    renderPhase(baseState());
    const button = document.querySelector('button[data-phase-cta="continue"]')!;
    expect(button.getAttribute("data-phase-cta-disabled")).toBe("true");
    fireEvent.click(document.querySelectorAll('button[data-phase-cta="date-secondary"]')[0]!);
    expect(
      document
        .querySelector('button[data-phase-cta="continue"]')!
        .getAttribute("data-phase-cta-disabled"),
    ).toBe("false");
  });

  it("reveals airport and cruise options only after Lisbon is chosen", () => {
    renderPhase(baseState({ dateMode: "flexible" }));
    expect(moment()).toBe("where");
    expect(screen.queryByTestId("studio-v3-lisbon-arrivals")).toBeNull();
    fireEvent.click(screen.getByText("Lisbon"));
    expect(screen.getByTestId("studio-v3-lisbon-arrivals")).toBeTruthy();
    fireEvent.click(screen.getByText("Cruise terminal"));
    expect(
      document.querySelector('[data-pickup-id="lisbon-cruise"]')!.getAttribute("data-selected"),
    ).toBe("true");
  });

  it("steps back inside logistics before leaving the phase", () => {
    const onBackPhase = vi.fn();
    renderPhase(baseState({ dateMode: "flexible" }), vi.fn(), onBackPhase);
    expect(moment()).toBe("where");
    fireEvent.click(screen.getByTestId("studio-v3-back"));
    expect(moment()).toBe("when");
    expect(onBackPhase).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("studio-v3-back"));
    expect(onBackPhase).toHaveBeenCalledTimes(1);
  });

  it("shows the acknowledgement at most once", () => {
    renderPhase(baseState());
    const shown = screen.queryAllByTestId("studio-v3-understood-summary");
    expect(shown.length).toBeLessThanOrEqual(1);
    fireEvent.click(document.querySelectorAll('button[data-phase-cta="date-secondary"]')[0]!);
    clickContinue();
    expect(screen.queryByTestId("studio-v3-understood-summary")).toBeNull();
  });

  it("keeps every interactive control at a 44px tap target", () => {
    renderPhase(baseState({ dateMode: "flexible", pickup: "lisbon" as Pickup }));
    const editButtons = document.querySelectorAll("[data-edit-row]");
    expect(editButtons.length).toBe(3);
    editButtons.forEach((b) => expect(b.className).toContain("min-h-[44px]"));
    expect(cta()).toBeTruthy();
  });
});
