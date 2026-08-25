/**
 * P4 — Faster Intelligence contract.
 *
 * Locks two things without brittle snapshots:
 *  1. `NextTeaser` no longer paints a recurring "Next…" copy layer.
 *  2. The GLOBAL reaction ceilings in `StudioV3.tsx` are exactly
 *     map-beat 2600ms, interests/rhythm 2200ms, everything else 1400ms.
 *
 * FooterHint / ContinueCta behaviour is asserted to be unchanged, since some
 * hints are instructional and must keep rendering.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextTeaser, FooterHint, ContinueCta } from "../PhaseChrome";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

describe("P4 — NextTeaser is silent", () => {
  it("renders nothing", () => {
    const { container } = render(<NextTeaser>Next: something cinematic</NextTeaser>);
    expect(container.textContent).toBe("");
    expect(container.querySelector("p")).toBeNull();
  });
});

describe("P4 — reaction ceilings", () => {
  it("uses exactly 2600 / 2200 / 1400 and no legacy 3800 ceiling", () => {
    expect(STUDIO_SRC).not.toContain("3800");
    expect(STUDIO_SRC).toContain('r.kind === "map-beat" ? 2600');
    expect(STUDIO_SRC).toContain('r.kind === "interests" || r.kind === "rhythm" ? 2200');
    expect(STUDIO_SRC).toMatch(/\? 2200\s*\n?\s*:\s*1400/);
    expect(STUDIO_SRC).toContain('reaction.kind === "map-beat"');
    expect(STUDIO_SRC).toContain("? 2600");
    expect(STUDIO_SRC).toContain("? 2200");
    expect(STUDIO_SRC).toContain(": 1400");
  });
});

describe("P4 — instructional chrome unchanged", () => {
  it("FooterHint still renders its children", () => {
    render(<FooterHint>Pick up to three</FooterHint>);
    expect(screen.getByText("Pick up to three")).toBeTruthy();
  });

  it("ContinueCta still renders its label and disabled contract", () => {
    render(<ContinueCta disabled={false} onClick={() => {}} label="Continue" />);
    const cta = screen.getByRole("button", { name: /continue/i });
    expect(cta.getAttribute("data-phase-cta")).toBe("continue");
    expect(cta.getAttribute("data-phase-cta-disabled")).toBe("false");
  });
});
