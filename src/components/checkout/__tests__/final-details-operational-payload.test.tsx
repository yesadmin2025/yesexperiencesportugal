/**
 * Pass 1B — FinalDetailsDialog is the single source of operational truth.
 *
 * Proves a NON-EMPTY operational payload survives the dialog into the
 * checkout callback: startTime, language, dietary, mobility, children,
 * occasion, guideNotes. Also proves the seeded start time (Signature's
 * chosen pickup time, Tailor's default) hydrates and stays editable.
 *
 * Behavioural only — no business logic is touched.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FinalDetailsDialog } from "../FinalDetailsDialog";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock("../BrandedCheckoutDrawer", () => ({
  prewarmStripeScript: vi.fn(),
}));

function fill(name: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

function renderDialog(
  initial: Parameters<typeof FinalDetailsDialog>[0]["initial"],
  onConfirm = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <FinalDetailsDialog
      open
      onOpenChange={() => {}}
      onConfirm={onConfirm}
      tourId="arrabida-wine-allinclusive"
      initial={initial}
    />,
  );
  return onConfirm;
}

const BASE = {
  tourDate: "2027-05-10",
  adults: 2,
  minorAges: [],
  pickupAddress: "Ritz Lisbon",
} as const;

describe("FinalDetailsDialog carries the full operational payload", () => {
  it("submits every operational field with a non-empty value", async () => {
    const onConfirm = renderDialog({ ...BASE, startTime: "09:00" });

    fill(/full name/i, "Ada Lovelace");
    fill(/email/i, "ada@example.com");
    fill(/phone/i, "+351 900 000 000");

    // Operational preferences live behind the extras disclosure.
    fireEvent.click(screen.getByTestId("final-details-extras-toggle"));
    fill(/dietary restrictions/i, "No shellfish");
    fill(/mobility notes/i, "One folding wheelchair");
    fill(/child seats or logistics/i, "One booster seat");
    fill(/special occasion/i, "Anniversary");
    fill(/notes for the guide/i, "Please start with the viewpoint");

    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+351 900 000 000",
      tourDate: "2027-05-10",
      pickupAddress: "Ritz Lisbon",
      startTime: "09:00",
      language: "en",
      dietary: "No shellfish",
      mobility: "One folding wheelchair",
      children: "One booster seat",
      occasion: "Anniversary",
      guideNotes: "Please start with the viewpoint",
    });
  });

  it("hydrates the seeded start time and lets the guest change it", async () => {
    const onConfirm = renderDialog({ ...BASE, startTime: "08:00" });

    fireEvent.click(screen.getByTestId("final-details-extras-toggle"));
    const group = screen.getByTestId("final-details-start-time");
    const seeded = within(group).getByRole("button", { name: "08:00" });
    expect(seeded).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(group).getByRole("button", { name: "10:00" }));
    expect(within(group).getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fill(/full name/i, "Ada Lovelace");
    fill(/email/i, "ada@example.com");
    fill(/phone/i, "+351 900 000 000");
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0].startTime).toBe("10:00");
  });

  it("offers exactly the three operational start times", () => {
    renderDialog({ ...BASE, startTime: "09:00" });
    fireEvent.click(screen.getByTestId("final-details-extras-toggle"));
    const group = screen.getByTestId("final-details-start-time");
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "08:00",
      "09:00",
      "10:00",
    ]);
  });
});

import { within } from "@testing-library/react";
