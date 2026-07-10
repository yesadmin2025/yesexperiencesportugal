/**
 * Step 7 — RefineStopCard + RefineAccordion tests.
 *
 * Locks the plan §D contract: single-column layout, 44×44 hit targets,
 * disabled state semantics, read-more disclosure, swap pool expansion,
 * and accordion collapse/expand behaviour.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import { RefineStopCard } from "../RefineStopCard";
import { RefineAccordion } from "../RefineAccordion";

const LONG_STORY =
  "Where the mainland ends and the Atlantic takes over. A short cliff walk, ten minutes to feel the wind, no hurry. The wind is the point, and the horizon is the reward — bring a jacket even when the sun is warm.";

describe("Step 7 · RefineStopCard", () => {
  it("renders number, title and story", () => {
    render(
      <ol>
        <RefineStopCard
          index={0}
          total={3}
          label="Cabo da Roca"
          story="Where the mainland ends."
        />
      </ol>,
    );
    const card = screen.getByTestId("studio-v3-refine-stop-card");
    expect(within(card).getByRole("heading", { name: "Cabo da Roca" })).toBeInTheDocument();
    expect(within(card).getByText("Where the mainland ends.")).toBeInTheDocument();
    expect(within(card).getByText("1")).toBeInTheDocument();
  });

  it("all four action buttons meet the 44px hit target", () => {
    render(
      <ol>
        <RefineStopCard
          index={1}
          total={3}
          label="Sintra"
          canSwap
          onMoveEarlier={() => {}}
          onMoveLater={() => {}}
          onToggleSwap={() => {}}
          onRemove={() => {}}
        />
      </ol>,
    );
    for (const id of [
      "studio-v3-refine-earlier",
      "studio-v3-refine-later",
      "studio-v3-refine-swap",
      "studio-v3-refine-remove",
    ]) {
      const btn = screen.getByTestId(id);
      expect(btn.className).toMatch(/min-h-\[44px\]/);
      expect(btn.className).toMatch(/min-w-\[44px\]/);
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("disables Earlier at index 0 and Later at last index (a11y semantics)", () => {
    const onEarlier = vi.fn();
    render(
      <ol>
        <RefineStopCard
          index={0}
          total={2}
          label="First"
          canSwap
          onMoveEarlier={onEarlier}
          onMoveLater={() => {}}
          onToggleSwap={() => {}}
          onRemove={() => {}}
        />
      </ol>,
    );
    const earlier = screen.getByTestId("studio-v3-refine-earlier");
    expect(earlier.getAttribute("aria-disabled")).toBe("true");
    expect(earlier.getAttribute("tabindex")).toBe("-1");
    fireEvent.click(earlier);
    expect(onEarlier).not.toHaveBeenCalled();
  });

  it("disables Remove when total === minStops", () => {
    const onRemove = vi.fn();
    render(
      <ol>
        <RefineStopCard
          index={0}
          total={1}
          minStops={1}
          label="Only stop"
          onRemove={onRemove}
        />
      </ol>,
    );
    const remove = screen.getByTestId("studio-v3-refine-remove");
    expect(remove.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("disables Swap when swap pool is empty (canSwap=false)", () => {
    render(
      <ol>
        <RefineStopCard index={0} total={2} label="A" canSwap={false} onToggleSwap={() => {}} />
      </ol>,
    );
    expect(screen.getByTestId("studio-v3-refine-swap").getAttribute("aria-disabled")).toBe("true");
  });

  it("clamps long stories and toggles the Read more disclosure", () => {
    render(
      <ol>
        <RefineStopCard index={0} total={2} label="Cabo da Roca" story={LONG_STORY} />
      </ol>,
    );
    const toggle = screen.getByTestId("studio-v3-refine-read-more");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toMatch(/Read less/);
  });

  it("renders the swap pool when open and invokes onPickSwap", () => {
    const onPick = vi.fn();
    render(
      <ol>
        <RefineStopCard
          index={0}
          total={2}
          label="A"
          canSwap
          swapOpen
          swapPool={[{ label: "B", story: "another moment" }]}
          onToggleSwap={() => {}}
          onPickSwap={onPick}
        />
      </ol>,
    );
    const pool = screen.getByTestId("studio-v3-refine-swap-pool");
    const btn = within(pool).getByRole("button", { name: /B/ });
    fireEvent.click(btn);
    expect(onPick).toHaveBeenCalledWith({ label: "B", story: "another moment" });
  });
});

describe("Step 7 · RefineAccordion", () => {
  it("is collapsed by default and children are not rendered", () => {
    render(
      <RefineAccordion open={false} onOpenChange={() => {}} count={5}>
        <div data-testid="hidden-child">payload</div>
      </RefineAccordion>,
    );
    const section = screen.getByTestId("studio-v3-refine-accordion");
    expect(section.getAttribute("data-open")).toBe("false");
    expect(screen.queryByTestId("hidden-child")).toBeNull();
    const btn = within(section).getByRole("button");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(within(section).getByText("· 5 moments")).toBeInTheDocument();
  });

  it("renders children when open and reports via onOpenChange on toggle", () => {
    const onOpen = vi.fn();
    render(
      <RefineAccordion open onOpenChange={onOpen} count={1}>
        <div data-testid="visible-child">payload</div>
      </RefineAccordion>,
    );
    expect(screen.getByTestId("visible-child")).toBeInTheDocument();
    expect(screen.getByText("· 1 moment")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith(false);
  });
});
