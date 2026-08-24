import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceGrid } from "../ChoiceGrid";
import { PhaseShell } from "../PhaseShell";
import type { ChoiceOption } from "../types";

type TestChoice = "coast" | "culture";

const OPTIONS: ChoiceOption<TestChoice>[] = [
  { id: "coast", label: "Atlantic coast", whisper: "Open horizons and sea air." },
  { id: "culture", label: "Local culture", whisper: "Stories, craft and living heritage." },
];

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

afterEach(cleanup);

describe("Studio V3 P3A editorial middle", () => {
  it("renders only the editorial progress phrase, never a numeric counter", () => {
    render(
      <PhaseShell
        progress={{ percent: 42, phrase: "Your day is taking shape" }}
        step={3}
        totalSteps={12}
      >
        <div>Question</div>
      </PhaseShell>,
    );

    const progress = screen.getByTestId("studio-v3-progress");
    expect(progress.textContent).toContain("Your day is taking shape");
    expect(progress.textContent).not.toMatch(/42|%|step\s+\d+\s+of\s+\d+/i);
    expect(progress.getAttribute("aria-label")).toBe("Your day is taking shape");

    const source = read("src/components/studio-v3/PhaseShell.tsx");
    expect(source).not.toContain("% shaped");
    expect(source).not.toMatch(/Step \$\{step\} of \$\{totalSteps\}/);
    expect(source).not.toContain("padStart(2");
  });

  it("does not render a numeric fallback when only step metadata is supplied", () => {
    render(
      <PhaseShell step={3} totalSteps={12}>
        <div>Question</div>
      </PhaseShell>,
    );

    expect(screen.queryByTestId("studio-v3-progress")).toBeNull();
    expect(document.body.textContent).not.toMatch(/step\s+3\s+of\s+12|03\s*·\s*12/i);
  });

  it("keeps ChoiceGrid selection, accessibility and data contracts intact", () => {
    const onSelect = vi.fn();
    render(<ChoiceGrid options={OPTIONS} value="coast" onSelect={onSelect} columns={1} />);

    const choices = screen.getAllByTestId("studio-v3-choice");
    const coast = choices.find((node) => node.getAttribute("data-option-id") === "coast");
    const culture = choices.find((node) => node.getAttribute("data-option-id") === "culture");

    expect(coast).toBeTruthy();
    expect(culture).toBeTruthy();
    if (!coast || !culture) return;

    expect(coast.getAttribute("role")).toBe("radio");
    expect(coast.getAttribute("aria-checked")).toBe("true");
    expect(coast.getAttribute("data-phase-cta")).toBe("choice");
    expect(coast.getAttribute("data-selected")).toBe("true");
    expect(coast.getAttribute("data-locked")).toBe("false");
    expect(culture.getAttribute("aria-checked")).toBe("false");
    expect(culture.getAttribute("data-selected")).toBe("false");
    expect(coast.style.background).not.toBe(culture.style.background);

    const dot = coast.querySelector("span[aria-hidden]") as HTMLElement | null;
    expect(dot).toBeTruthy();
    expect(dot?.style.background).toBe("var(--gold)");

    fireEvent.click(culture);
    expect(onSelect).toHaveBeenCalledWith("culture");
  });

  it("uses an editorial surface with no shadow or hover lift", () => {
    render(<ChoiceGrid options={OPTIONS} value={null} onSelect={vi.fn()} />);
    const choice = screen.getAllByTestId("studio-v3-choice")[0];

    expect(choice.className).toContain("border-b");
    expect(choice.className).toContain("min-h-[64px]");
    expect(choice.className).not.toMatch(/translate-y|box-shadow/);
    expect(choice.style.boxShadow).toBe("");

    const source = read("src/components/studio-v3/ChoiceGrid.tsx");
    expect(source).not.toContain("boxShadow");
    expect(source).not.toContain("hover:-translate-y");
    expect(source).not.toContain("box-shadow");
  });

  it("keeps the multi-select cap unchanged", () => {
    const onToggle = vi.fn();
    render(
      <ChoiceGrid
        options={OPTIONS}
        mode="multi"
        values={["coast"]}
        onToggle={onToggle}
        maxSelected={1}
        columns={1}
      />,
    );

    const choices = screen.getAllByTestId("studio-v3-choice");
    const coast = choices.find((node) => node.getAttribute("data-option-id") === "coast");
    const culture = choices.find((node) => node.getAttribute("data-option-id") === "culture");

    expect(coast).toBeTruthy();
    expect(culture).toBeTruthy();
    if (!coast || !culture) return;

    expect(coast.getAttribute("role")).toBe("checkbox");
    expect(culture.getAttribute("role")).toBe("checkbox");
    expect(culture.getAttribute("aria-disabled")).toBe("true");
    expect(culture.getAttribute("data-locked")).toBe("true");
    expect((culture as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(culture);
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(coast);
    expect(onToggle).toHaveBeenCalledWith("coast");
  });
});
