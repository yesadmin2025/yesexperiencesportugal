/**
 * GuestDetailsStep — Step 12 unit tests.
 *
 * Verifies the inline (non-modal) Guest Details phase:
 * - renders inline (no dialog role)
 * - Back callback fires without submitting
 * - Stripe / onSubmit only fires after required fields pass validation
 * - Sticky CTA bar renders at the bottom
 * - Never shows retired "Say YES" / "Everything included" copy
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestDetailsStep } from "../GuestDetailsStep";

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

describe("GuestDetailsStep", () => {
  it("renders inline (no modal dialog wrapper)", () => {
    render(
      <GuestDetailsStep
        onBack={() => {}}
        onSubmit={() => {}}
        journeyTitle="A quiet day in Sintra"
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("studio-v3-guest-details")).toBeInTheDocument();
    expect(screen.getByText("A quiet day in Sintra")).toBeInTheDocument();
  });

  it("fires onBack when the back button is clicked", () => {
    const onBack = vi.fn();
    render(<GuestDetailsStep onBack={onBack} onSubmit={() => {}} />);
    fireEvent.click(screen.getByTestId("studio-v3-guest-details-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does not fire onSubmit when required fields are empty", async () => {
    const onSubmit = vi.fn();
    render(<GuestDetailsStep onBack={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("fires onSubmit with the full GuestDetails payload once required fields are filled", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GuestDetailsStep
        onBack={() => {}}
        onSubmit={onSubmit}
        initial={{ tourDate: "2027-05-10", guests: 3, pickupAddress: "Ritz Lisbon" }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /full name/i }), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /phone/i }), {
      target: { value: "+351 900 000 000" },
    });

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+351 900 000 000",
      tourDate: "2027-05-10",
      guests: 3,
      pickupAddress: "Ritz Lisbon",
      language: "en",
    });
  });

  it("renders the sticky CTA bar and safe-area container", () => {
    render(<GuestDetailsStep onBack={() => {}} onSubmit={() => {}} />);
    expect(screen.getByTestId("studio-v3-guest-details-cta-bar")).toBeInTheDocument();
  });

  it("never renders retired vocabulary", () => {
    const { container } = render(<GuestDetailsStep onBack={() => {}} onSubmit={() => {}} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Say YES/i);
    expect(text).not.toMatch(/Everything included/i);
    expect(text).not.toMatch(/All entrances included/i);
  });
});

describe("GuestDetailsStep — P0 friction pass", () => {
  it("collapses the optional information group by default", () => {
    render(<GuestDetailsStep onBack={() => {}} onSubmit={() => {}} />);
    const group = screen.getByTestId("studio-v3-guest-details-optional") as HTMLDetailsElement;
    expect(group.open).toBe(false);
  });

  it("hides Main contact person behind 'Booking for someone else?'", () => {
    render(<GuestDetailsStep onBack={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByTestId("studio-v3-main-contact-input")).toBeNull();
    fireEvent.click(screen.getByTestId("studio-v3-main-contact-toggle"));
    expect(screen.getByTestId("studio-v3-main-contact-input")).toBeInTheDocument();
  });

  it("still submits every optional field once the disclosure is expanded", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GuestDetailsStep
        onBack={() => {}}
        onSubmit={onSubmit}
        initial={{ tourDate: "2027-05-10", guests: 2, pickupAddress: "Ritz Lisbon" }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /full name/i }), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /phone/i }), {
      target: { value: "+351 900 000 000" },
    });

    fireEvent.click(screen.getByTestId("studio-v3-main-contact-toggle"));
    fireEvent.change(screen.getByTestId("studio-v3-main-contact-input"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /dietary restrictions/i }), {
      target: { value: "No shellfish" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /mobility notes/i }), {
      target: { value: "Slow on steps" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /special occasion/i }), {
      target: { value: "Anniversary" },
    });

    fireEvent.click(screen.getByTestId("studio-v3-guest-details-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      mainContact: "Grace Hopper",
      dietary: "No shellfish",
      mobility: "Slow on steps",
      occasion: "Anniversary",
    });
  });

  it("presents a locked date as a remembered fact, not a question", () => {
    render(
      <GuestDetailsStep
        onBack={() => {}}
        onSubmit={() => {}}
        fixedTourDate="2027-05-10"
        onEditOperational={() => {}}
      />,
    );
    expect(screen.getByTestId("studio-v3-fixed-tour-date")).toBeInTheDocument();
    expect(screen.getAllByText(/already set/i).length).toBeGreaterThan(0);
  });

  it("presents a locked party as a remembered fact, not a question", () => {
    render(
      <GuestDetailsStep
        onBack={() => {}}
        onSubmit={() => {}}
        lockedComposition={{ adults: 2, minorAges: [7] }}
        onEditOperational={() => {}}
      />,
    );
    // Party is stated back, not re-asked with an editable counter.
    expect(screen.getAllByText(/already set/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("spinbutton", { name: /adults/i })).toBeNull();
  });
});

