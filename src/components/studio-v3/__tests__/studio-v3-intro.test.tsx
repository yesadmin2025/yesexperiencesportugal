// Studio V3 — P2 opening contract.
//
// The intro is two moments only (welcome → optional name). There is no
// third "path" screen and no Guided/Fast product cards, yet both path
// modes still reach `onComplete`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudioV3Intro } from "../StudioV3Intro";

const src = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3Intro.tsx"),
  "utf8",
);
const shellSrc = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/LivingAtlasStudioPage.tsx"),
  "utf8",
);

afterEach(cleanup);

function openNameStep() {
  const onComplete = vi.fn();
  render(<StudioV3Intro onComplete={onComplete} />);
  fireEvent.click(screen.getByTestId("studio-v3-intro-begin"));
  return onComplete;
}

describe("StudioV3Intro — P2 opening", () => {
  it("opens on welcome with an editorial headline and no feature strip", () => {
    render(<StudioV3Intro onComplete={vi.fn()} />);
    expect(screen.getByTestId("studio-v3-intro-headline").textContent).toContain(
      "is the stage. You write the story.",
    );
    expect(screen.queryByTestId("studio-v3-intro-meta")).toBeNull();
    expect(document.body.textContent).not.toMatch(/live route map/i);
    expect(document.body.textContent).not.toMatch(/drive-time checks/i);
    expect(document.body.textContent).not.toMatch(/region-aware moments/i);
  });

  it("Begin opens the optional-name moment with one click", () => {
    openNameStep();
    expect(screen.getByTestId("studio-v3-intro-name")).toBeTruthy();
    expect(screen.getByLabelText("Your first name (optional)")).toBeTruthy();
  });

  it("keeps crawler-only links out of the live Studio focus order after hydration", () => {
    expect(shellSrc).toContain("{!hydrated && (");
    expect(shellSrc).toContain('data-testid="studio-v3-ssr-intent"');
    expect(shellSrc).toContain('data-hydrated={hydrated ? "true" : "false"}');
    expect(shellSrc).toContain('className={hydrated ? undefined : "pointer-events-none"}');
  });

  it("has no third path screen and no Guided/Fast/Recommended cards", () => {
    openNameStep();
    expect(screen.queryByTestId("studio-v3-intro-path")).toBeNull();
    expect(screen.queryByTestId("studio-v3-intro-path-option")).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/recommended/i);
    expect(text).not.toMatch(/compose it quickly/i);
    expect(text).not.toMatch(/five minutes|two minutes/i);
    expect(src).not.toContain("PathCard");
    expect(src).not.toContain("intro-path");
  });

  it("name submit completes in guided mode with the sanitised name", () => {
    const onComplete = openNameStep();
    fireEvent.change(screen.getByLabelText("Your first name (optional)"), {
      target: { value: "  An4a  " },
    });
    fireEvent.click(screen.getByText("Continue"));
    expect(onComplete).toHaveBeenCalledWith("Ana", "guided");
  });

  it("Skip completes in guided mode with no name", () => {
    const onComplete = openNameStep();
    fireEvent.click(screen.getByText("Skip"));
    expect(onComplete).toHaveBeenCalledWith(null, "guided");
  });

  it("'Use the quick version' completes in fast mode, keeping a typed name", () => {
    const onComplete = openNameStep();
    fireEvent.change(screen.getByLabelText("Your first name (optional)"), {
      target: { value: "Nidia" },
    });
    fireEvent.click(screen.getByTestId("studio-v3-intro-quick"));
    expect(onComplete).toHaveBeenCalledWith("Nidia", "fast");
  });

  it("'Use the quick version' passes null when the field is empty", () => {
    const onComplete = openNameStep();
    fireEvent.click(screen.getByTestId("studio-v3-intro-quick"));
    expect(onComplete).toHaveBeenCalledWith(null, "fast");
  });

  it("quick action keeps a 44px tap target and stays a quiet text action", () => {
    openNameStep();
    const quick = screen.getByTestId("studio-v3-intro-quick");
    expect(quick.className).toContain("min-h-[44px]");
    expect(quick.className).not.toMatch(/border|rounded-full|bg-/);
  });

  it("progress reassurance uses editorial phrases, not 'Beat 1 of 4'", () => {
    const stepper = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/StudioV3ProgressStepper.tsx"),
      "utf8",
    );
    expect(stepper).not.toMatch(/Beat \d of \d/);
    expect(stepper).toContain("Start with the feeling");
    expect(stepper).toContain("Now, what draws you");
    expect(stepper).toContain("Now, make it real");
    expect(stepper).toContain("Your day is taking shape");
    for (const label of ["Feel", "Taste", "Shape", "Your day"]) {
      expect(stepper).toContain(`label: "${label}"`);
    }
  });
});
