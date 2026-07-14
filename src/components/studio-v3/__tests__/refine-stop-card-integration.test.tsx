/**
 * RefineStopCard integration tests — covers desktop/mobile layout,
 * empty + error states, and swap-pick edge cases, complementing the
 * primitive test in `refine-stop-card.test.tsx`.
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RefineStopCard } from "../RefineStopCard";
import { RefineAccordion } from "../RefineAccordion";

interface Stop {
  label: string;
  story: string;
}

function StopList({
  stops,
  swapPool = [],
  onChange,
}: {
  stops: Stop[];
  swapPool?: Array<{ label: string; story?: string }>;
  onChange?: (next: Stop[]) => void;
}) {
  const [list, setList] = React.useState<Stop[]>(stops);
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const commit = (next: Stop[]) => {
    setList(next);
    onChange?.(next);
  };
  return (
    <ol>
      {list.map((s, i) => (
        <RefineStopCard
          key={`${s.label}-${i}`}
          index={i}
          total={list.length}
          label={s.label}
          story={s.story}
          canSwap={swapPool.length > 0}
          swapPool={swapPool}
          swapOpen={openIdx === i}
          onMoveEarlier={() =>
            commit(list.map((x, j) => (j === i - 1 ? list[i] : j === i ? list[i - 1] : x)))
          }
          onMoveLater={() =>
            commit(list.map((x, j) => (j === i ? list[i + 1] : j === i + 1 ? list[i] : x)))
          }
          onToggleSwap={() => setOpenIdx(openIdx === i ? null : i)}
          onPickSwap={(cand) => {
            commit(list.map((x, j) => (j === i ? { label: cand.label, story: cand.story ?? "" } : x)));
            setOpenIdx(null);
          }}
          onRemove={() => commit(list.filter((_, j) => j !== i))}
        />
      ))}
    </ol>
  );
}


const STOPS: Stop[] = [
  { label: "Cabo da Roca", story: "Where the mainland ends." },
  { label: "Sintra", story: "Palaces above the mist." },
  { label: "Cascais", story: "Small harbour, long lunch." },
  { label: "Guincho", story: "The wind is the point." },
];

function mockViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes(`min-width: 640px`) ? width >= 640 : width < 640,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("RefineStopCard — desktop layout (≥1024px)", () => {
  beforeEach(() => mockViewport(1280));
  afterEach(() => vi.restoreAllMocks());

  it("renders all four action buttons with 44×44 targets and aria labels", () => {
    render(<StopList stops={STOPS} swapPool={[{ label: "Azenhas do Mar" }]} />);
    const cards = screen.getAllByTestId("studio-v3-refine-stop-card");
    expect(cards).toHaveLength(4);
    const first = cards[0];
    for (const id of [
      "studio-v3-refine-earlier",
      "studio-v3-refine-later",
      "studio-v3-refine-swap",
      "studio-v3-refine-remove",
    ]) {
      const btn = within(first).getByTestId(id);
      expect(btn.className).toMatch(/min-h-\[44px\]/);
      expect(btn.className).toMatch(/min-w-\[44px\]/);
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("moves a stop earlier when Later is clicked from an earlier card", () => {
    const onChange = vi.fn();
    render(<StopList stops={STOPS} onChange={onChange} />);
    const laterBtns = screen.getAllByTestId("studio-v3-refine-later");
    fireEvent.click(laterBtns[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Stop[];
    expect(next[0].label).toBe("Sintra");
    expect(next[1].label).toBe("Cabo da Roca");
  });
});

describe("RefineStopCard — mobile layout (393px)", () => {
  beforeEach(() => mockViewport(393));
  afterEach(() => vi.restoreAllMocks());

  it("hides action text labels behind sm: breakpoint (icon-only cluster)", () => {
    render(<StopList stops={STOPS} swapPool={[{ label: "Azenhas" }]} />);
    const first = screen.getAllByTestId("studio-v3-refine-stop-card")[0];
    const swap = within(first).getByTestId("studio-v3-refine-swap");
    // The visible label span uses `hidden sm:inline` — asserts the text
    // node with class contract so mobile stays icon-only.
    const label = within(swap).getByText("Swap");
    expect(label.className).toMatch(/hidden/);
    expect(label.className).toMatch(/sm:inline/);
  });

  it("keeps single-column layout — story below title, toolbar row below story", () => {
    render(<StopList stops={STOPS} />);
    const first = screen.getAllByTestId("studio-v3-refine-stop-card")[0];
    const heading = within(first).getByRole("heading", { name: "Cabo da Roca" });
    const toolbar = within(first).getByRole("toolbar");
    // heading must appear before the toolbar in DOM order (single column).
    expect(heading.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("RefineStopCard — empty + error states", () => {
  it("empty list renders nothing without crashing", () => {
    const { container } = render(<StopList stops={[]} />);
    expect(container.querySelector("ol")?.children.length ?? 0).toBe(0);
  });

  it("single-stop list disables Earlier, Later, and Remove", () => {
    render(<StopList stops={[STOPS[0]]} />);
    expect(screen.getByTestId("studio-v3-refine-earlier").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByTestId("studio-v3-refine-later").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByTestId("studio-v3-refine-remove").getAttribute("aria-disabled")).toBe("true");
  });

  it("swap-pick with a candidate missing `story` coerces to empty string (regression guard)", () => {
    const onChange = vi.fn();
    render(
      <StopList
        stops={[STOPS[0], STOPS[1]]}
        swapPool={[{ label: "Azenhas do Mar" }] /* no story */}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByTestId("studio-v3-refine-swap")[0]);
    const pool = screen.getByTestId("studio-v3-refine-swap-pool");
    fireEvent.click(within(pool).getByRole("button", { name: /Azenhas/ }));
    const next = onChange.mock.calls[0][0] as Stop[];
    expect(next[0]).toEqual({ label: "Azenhas do Mar", story: "" });
  });

  it("swap disabled when pool is empty (canSwap=false)", () => {
    render(<StopList stops={STOPS} swapPool={[]} />);
    for (const btn of screen.getAllByTestId("studio-v3-refine-swap")) {
      expect(btn.getAttribute("aria-disabled")).toBe("true");
      expect(btn.getAttribute("tabindex")).toBe("-1");
    }
  });

  it("does not crash when a handler throws — error surfaces to the caller, tree stays mounted", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BrokenParent() {
      return (
        <ol>
          <RefineStopCard
            index={0}
            total={2}
            label="A"
            story="…"
            onRemove={() => {
              throw new Error("remove failed");
            }}
          />
        </ol>
      );
    }
    render(<BrokenParent />);
    const remove = screen.getByTestId("studio-v3-refine-remove");
    // Click throws synchronously — React logs to console.error but the card
    // remains in the document; we assert the DOM stayed intact.
    expect(() => fireEvent.click(remove)).toThrow(/remove failed/);
    expect(screen.getByTestId("studio-v3-refine-stop-card")).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("RefineAccordion — collapsed + expanded state", () => {
  it("collapsed accordion hides children from the DOM", () => {
    render(
      <RefineAccordion open={false} onOpenChange={() => {}} count={4}>
        <StopList stops={STOPS} />
      </RefineAccordion>,
    );
    expect(screen.queryByTestId("studio-v3-refine-stop-card")).toBeNull();
  });

  it("expanded accordion renders the stop list", () => {
    render(
      <RefineAccordion open onOpenChange={() => {}} count={4}>
        <StopList stops={STOPS} />
      </RefineAccordion>,
    );
    expect(screen.getAllByTestId("studio-v3-refine-stop-card")).toHaveLength(4);
  });
});
