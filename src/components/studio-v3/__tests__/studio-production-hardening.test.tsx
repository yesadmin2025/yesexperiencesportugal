/**
 * @vitest-environment jsdom
 *
 * Production hardening regressions for the public Experience Studio
 * (/studio-v3, Living Atlas):
 *  • a composed day survives a reload / back navigation;
 *  • it is persisted in sessionStorage (tab-scoped, non-PII), never localStorage;
 *  • required guest fields raise accessible inline errors and focus the first
 *    offender;
 *  • a duplicate submit tap cannot start checkout twice.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearLivingAtlasPreviewState,
  loadLivingAtlasPreviewState,
  saveLivingAtlasPreviewState,
} from "../livingAtlasPreviewState";
import { GuestDetailsStep } from "../GuestDetailsStep";

const FUTURE_DATE = "2099-08-10";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Studio persistence across reload", () => {
  it("restores a composed day from sessionStorage and never writes it to localStorage", () => {
    saveLivingAtlasPreviewState({
      stage: "shape",
      pathMode: "discover",
      destinationIntent: "no-preference",
      selectedDate: FUTURE_DATE,
      selected: ["wine-table", "atlantic-coast"],
      leads: ["wine-table"],
      discoverySignal: null,
      preferences: {
        density: "balanced",
        wineEmphasis: "one-winery",
        atlanticMode: "boat",
        localMoment: "market",
      },
      replacements: {},
    });

    // Simulates a reload: fresh read of the same tab's storage.
    const restored = loadLivingAtlasPreviewState();
    expect(restored?.stage).toBe("shape");
    expect(restored?.selectedDate).toBe(FUTURE_DATE);
    expect(JSON.stringify(window.localStorage)).not.toContain(FUTURE_DATE);

    clearLivingAtlasPreviewState();
    expect(loadLivingAtlasPreviewState()).toBeNull();
  });
});

describe("Guest details validation", () => {
  it("shows accessible inline errors and focuses the first invalid field", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep fixedTourDate={FUTURE_DATE} onSubmit={onSubmit} onBack={() => {}} />);

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();

    const nameInput = document.querySelector<HTMLInputElement>('input[autocomplete="name"]');
    expect(nameInput?.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(nameInput);
  });

  it("does not submit twice on a duplicate tap", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(<GuestDetailsStep fixedTourDate={FUTURE_DATE} onSubmit={onSubmit} onBack={() => {}} />);

    fireEvent.change(document.querySelector('input[autocomplete="name"]')!, {
      target: { value: "Ana Ferreira" },
    });
    fireEvent.change(document.querySelector('input[autocomplete="email"]')!, {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(document.querySelector('input[autocomplete="tel"]')!, {
      target: { value: "+351911111111" },
    });
    const pickup = Array.from(document.querySelectorAll("input")).find(
      (el) => el.placeholder === "Hotel, address or meeting point",
    );
    fireEvent.change(pickup!, { target: { value: "Hotel Avenida, Lisbon" } });

    const submit = screen.getByTestId("studio-v3-guest-details-submit");
    fireEvent.click(submit);
    fireEvent.click(submit);
    const alerts = screen.queryAllByRole("alert").map((el) => el.textContent);
    expect(alerts, `unexpected validation errors: ${alerts.join(" | ")}`).toEqual([]);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    resolveSubmit?.();
  });
});
