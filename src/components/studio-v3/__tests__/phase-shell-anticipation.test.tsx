/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhaseShell } from "../PhaseShell";

afterEach(() => cleanup());

describe("PhaseShell anticipation layer", () => {
  it("injects the Portugal anticipation layer between wash and content", () => {
    render(
      <PhaseShell anticipation={{ fill: 0.42, region: "arrabida" }}>
        <div data-testid="phase-child">Question content</div>
      </PhaseShell>,
    );

    const wash = screen.getByTestId("studio-v3-wash-layer");
    const anticipation = screen.getByTestId("studio-v3-anticipation-layer");
    const content = screen.getByTestId("studio-v3-content-layer");

    expect(anticipation.getAttribute("data-region")).toBe("arrabida");
    expect(screen.getByTestId("studio-v3-region-pulse")).toBeTruthy();
    expect(wash.compareDocumentPosition(anticipation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(anticipation.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render a pulse before destinationIntent resolves to a region", () => {
    render(
      <PhaseShell anticipation={{ fill: 0.18, region: null }}>
        <div>Question content</div>
      </PhaseShell>,
    );

    expect(screen.getByTestId("studio-v3-anticipation-layer").getAttribute("data-region")).toBe("none");
    expect(screen.queryByTestId("studio-v3-region-pulse")).toBeNull();
  });
});