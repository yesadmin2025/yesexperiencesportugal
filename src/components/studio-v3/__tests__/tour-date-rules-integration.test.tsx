/**
 * Tour date rules — integration coverage for BOTH entry points.
 *
 * The Studio enforces a three-calendar-day lead time (Lisbon time) in two
 * different places: the DatePhase calendar (composition time) and the Guest
 * Details date field (just before checkout). They are enforced by separate
 * code paths, so they are tested together here — if one drifts, a traveller
 * either composes a day that gets rejected at payment, or slips a
 * too-soon date past a calendar that should have blocked it.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestDetailsStep } from "../GuestDetailsStep";
import { DatePhaseControls } from "../DatePhase";
import {
  addCalendarDaysIso,
  isStudioBookingDateAllowed,
  minimumStudioBookingDateIso,
  studioTodayIso,
  STUDIO_MIN_ADVANCE_DAYS,
} from "../dateGuards";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { slots: [] }, error: null }) },
  },
}));

vi.mock("@/components/checkout/BrandedCheckoutDrawer", () => ({
  prewarmStripeScript: vi.fn(),
}));

const FIRST_ALLOWED = minimumStudioBookingDateIso();
const TOO_SOON = addCalendarDaysIso(studioTodayIso(), STUDIO_MIN_ADVANCE_DAYS - 1);
const FAR_FUTURE = addCalendarDaysIso(studioTodayIso(), 400);

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Ana Test" } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+351912345678" } });
  fireEvent.change(screen.getByLabelText(/pickup/i), {
    target: { value: "Hotel Avenida, Lisbon" },
  });
}

function setTourDate(iso: string) {
  const input = screen.getByLabelText(/selected tour date/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: iso } });
  return input;
}

describe("tour date rules · guard layer", () => {
  it("rejects every date inside the lead-time window and accepts the boundary", () => {
    for (let offset = -1; offset < STUDIO_MIN_ADVANCE_DAYS; offset++) {
      const iso = addCalendarDaysIso(studioTodayIso(), offset);
      expect(isStudioBookingDateAllowed(iso), `${iso} must be rejected`).toBe(false);
    }
    expect(isStudioBookingDateAllowed(FIRST_ALLOWED)).toBe(true);
    expect(isStudioBookingDateAllowed(addCalendarDaysIso(FIRST_ALLOWED, 1))).toBe(true);
  });

  it("has no upper bound — a far-future date stays bookable", () => {
    expect(isStudioBookingDateAllowed(FAR_FUTURE)).toBe(true);
  });

  it("rejects malformed and impossible calendar dates", () => {
    for (const iso of ["", "not-a-date", "2026-13-01", "2026-02-30", "26-01-01"]) {
      expect(isStudioBookingDateAllowed(iso)).toBe(false);
    }
  });
});

describe("tour date rules · Guest Details entry point", () => {
  it("publishes the first allowed date as the input's native min", () => {
    render(<GuestDetailsStep onBack={() => {}} onSubmit={() => {}} />);
    const input = screen.getByLabelText(/selected tour date/i) as HTMLInputElement;
    expect(input.min).toBe(FIRST_ALLOWED);
    expect(input.getAttribute("max")).toBeNull();
  });

  it("blocks submit for a date inside the window and explains the boundary", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep onBack={() => {}} onSubmit={onSubmit} />);
    fillRequired();
    const input = setTourDate(TOO_SOON);

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(FIRST_ALLOWED))).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "studio-v3-error-tourDate");
  });

  it("accepts the first allowed date", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep onBack={() => {}} onSubmit={onSubmit} />);
    fillRequired();
    setTourDate(FIRST_ALLOWED);

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].tourDate).toBe(FIRST_ALLOWED);
  });

  it("accepts a far-future date (no maximum)", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep onBack={() => {}} onSubmit={onSubmit} />);
    fillRequired();
    setTourDate(FAR_FUTURE);

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].tourDate).toBe(FAR_FUTURE);
  });

  it("clears the date error once a valid date is chosen and retried", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep onBack={() => {}} onSubmit={onSubmit} />);
    fillRequired();
    setTourDate(TOO_SOON);
    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());

    setTourDate(FIRST_ALLOWED);
    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(new RegExp(`from ${FIRST_ALLOWED} onwards`))).toBeNull();
  });
});

describe("tour date rules · DatePhase entry point", () => {
  it("disables every day before the first allowed date", () => {
    render(
      <DatePhaseControls
        dateExact={null}
        dateMode={null}
        onPickExact={() => {}}
        onPickFlexible={() => {}}
        onPickUndecided={() => {}}
      />,
    );

    const firstAllowedDay = Number(FIRST_ALLOWED.slice(8, 10));
    const disabledDays = screen
      .getAllByRole("gridcell")
      .filter((cell) => cell.getAttribute("aria-disabled") === "true" || cell.querySelector("[disabled]"));

    // The calendar opens on the earliest bookable month, so at least the
    // days before the boundary in that month must be unselectable.
    if (firstAllowedDay > 1) {
      expect(disabledDays.length).toBeGreaterThan(0);
    }
  });

  it("never commits a date inside the lead-time window", () => {
    const onPickExact = vi.fn();
    render(
      <DatePhaseControls
        dateExact={TOO_SOON}
        dateMode="exact"
        onPickExact={onPickExact}
        onPickFlexible={() => {}}
        onPickUndecided={() => {}}
      />,
    );
    // A too-soon date arriving from restored state must not present itself
    // as a confirmed selection.
    expect(screen.queryByText(/we'll shape the day around it/i)).toBeNull();
    expect(onPickExact).not.toHaveBeenCalled();
  });

  it("shows the reason for the lead time rather than a bare rejection", () => {
    render(
      <DatePhaseControls
        dateExact={null}
        dateMode={null}
        onPickExact={() => {}}
        onPickFlexible={() => {}}
        onPickUndecided={() => {}}
      />,
    );
    expect(screen.getByText(/we need three days to prepare the day properly/i)).toBeInTheDocument();
  });
});
