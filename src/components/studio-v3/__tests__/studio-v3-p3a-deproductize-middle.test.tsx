/**
 * @vitest-environment jsdom
 *
 * P3A — de-productize the middle of the Studio.
 * PhaseShell must never show numeric progress; ChoiceGrid must read editorial
 * (no shadow, no hover lift) while keeping every behavioural contract.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChoiceGrid } from "../ChoiceGrid";
import { PhaseShell } from "../PhaseShell";
import type { ChoiceOption } from "../types";

afterEach(() => cleanup());

const readSource = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const options: ChoiceOption<"a" | "b" | "c">[] = [
  { id: "a", label: "Slow coastal morning", whisper: "Sea air before anything else" },
  { id: "b", label: "Vineyard table", whisper: "A long table under the vines" },
  { id: "c", label: "Old stone streets", whisper: "Quiet lanes, little traffic" },
];

describe("PhaseShell — no numeric progress", () => {
  it("renders only the editorial phrase, no percentage", () => {
    render(
      <PhaseShell progress={{ percent: 42, phrase: "Your day is taking shape" }}>
        <div>content</div>
      </PhaseShell>,
    );
    const progress = screen.getByTestId("studio-v3-progress");
    expect(progress.textContent).toContain("Your day is taking shape");
    expect(progress.textContent).not.toMatch(/%/);
    expect(progress.textContent).not.toMatch(/\d/);
    expect(progress.getAttribute("aria-label")).toBe("Your day is taking shape");
  });

  it("renders no numeric fallback when step/totalSteps are still passed", () => {
    const { container } = render(
      <PhaseShell step={3} totalSteps={12}>
        <div>content</div>
      </PhaseShell>,
    );
    expect(screen.queryByTestId("studio-v3-progress")).toBeNull();
    expect(container.textContent).not.toMatch(/Step\s*\d+\s*of\s*\d+/i);
    expect(container.textContent).not.toContain("03");
    expect(container.textContent).not.toContain("12");
  });

  it("source contains no percent/step progress strings", () => {
    const src = readSource("../PhaseShell.tsx");
    expect(src).not.toContain("% shaped");
    expect(src).not.toMatch(/Step \$\{step\} of/);
    expect(src).not.toContain("progress.percent");
  });
});

describe("ChoiceGrid — editorial surface, unchanged behaviour", () => {
  it("keeps native button semantics, aria and data attributes", () => {
    const onSelect = vi.fn();
    render(<ChoiceGrid label="Test question" options={options} value="b" onSelect={onSelect} />);
    const buttons = screen.getAllByTestId("studio-v3-choice");
    expect(buttons).toHaveLength(3);
    // Native <button> — no role override, so screen readers announce a
    // button with a pressed state, and the group carries the question label.
    expect(buttons[0]!.getAttribute("role")).toBeNull();
    expect(screen.getByRole("list", { name: "Test question" })).toBeTruthy();
    expect(buttons[0]!.getAttribute("data-phase-cta")).toBe("choice");
    expect(buttons[0]!.getAttribute("data-option-id")).toBe("a");
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1]!.getAttribute("data-selected")).toBe("true");
    expect(buttons[0]!.getAttribute("data-locked")).toBe("false");
    buttons[2]!.click();
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("respects the multi-select cap", () => {
    const onToggle = vi.fn();
    render(
      <ChoiceGrid
        label="Test multi question"
        options={options}
        mode="multi"
        values={["a", "b"]}
        onToggle={onToggle}
        maxSelected={2}
      />,
    );
    const buttons = screen.getAllByTestId("studio-v3-choice");
    expect(buttons[0]!.getAttribute("role")).toBeNull();
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true");
    const locked = buttons.find((b) => b.getAttribute("data-option-id") === "c")!;
    expect(locked.getAttribute("data-locked")).toBe("true");
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    locked.click();
    expect(onToggle).not.toHaveBeenCalled();
    buttons[0]!.click();
    expect(onToggle).toHaveBeenCalledWith("a");
  });

  it("selected state differs and keeps the gold dot, without shadow", () => {
    const { container } = render(<ChoiceGrid options={options} value="a" onSelect={() => {}} />);
    const buttons = screen.getAllByTestId("studio-v3-choice");
    const selectedStyle = buttons[0]!.getAttribute("style") ?? "";
    const plainStyle = buttons[1]!.getAttribute("style") ?? "";
    expect(selectedStyle).not.toBe(plainStyle);
    expect(selectedStyle).toContain("var(--teal)");
    expect(container.querySelector('span[class*="rounded-full"]')).toBeTruthy();
    for (const b of buttons) {
      const style = b.getAttribute("style") ?? "";
      expect(style).toMatch(/box-shadow:\s*none/);
      expect(style).not.toMatch(/box-shadow:\s*0/);
    }
  });

  it("has no box-shadow or hover-lift styling in source", () => {
    const src = readSource("../ChoiceGrid.tsx");
    expect(src).not.toMatch(/hover:-translate-y/);
    expect(src).not.toMatch(/hover:translate-y/);
    expect(src).not.toMatch(/rgba\(/);
    expect(src).not.toMatch(/boxShadow:\s*selected/);
    expect(src).toContain("min-h-[64px]");
    expect(src).toContain("motion-reduce:transition-none");
  });
});
