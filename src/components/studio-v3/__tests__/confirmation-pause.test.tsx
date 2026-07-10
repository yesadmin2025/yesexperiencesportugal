import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationPause } from "../ConfirmationPause";
import { CTA_PRIMARY } from "@/content/signature-day-copy";

function renderPause(overrides: Partial<React.ComponentProps<typeof ConfirmationPause>> = {}) {
  const onContinue = vi.fn();
  const onBack = vi.fn();
  render(
    <ConfirmationPause
      journeyTitle="Your private Arrábida day"
      summaryLine="Lisbon · Full rhythm · 2 guests"
      onContinue={onContinue}
      onBack={onBack}
      {...overrides}
    />,
  );
  return { onContinue, onBack };
}

describe("ConfirmationPause (plan §J)", () => {
  it("renders the journey title and the primary CTA using CTA_PRIMARY", () => {
    renderPause();
    expect(screen.getByTestId("studio-v3-confirmation-pause")).toBeTruthy();
    expect(screen.getByText("Your private Arrábida day")).toBeTruthy();
    const cta = screen.getByTestId("studio-v3-confirmation-continue");
    expect(cta.textContent).toContain(CTA_PRIMARY);
  });

  it("fires onContinue when the primary CTA is clicked", () => {
    const { onContinue } = renderPause();
    fireEvent.click(screen.getByTestId("studio-v3-confirmation-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("fires onBack when the return link is clicked", () => {
    const { onBack } = renderPause();
    fireEvent.click(screen.getByTestId("studio-v3-confirmation-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the ReassuranceStrip inside the pause", () => {
    renderPause();
    expect(screen.getByTestId("studio-v3-reassurance-strip")).toBeTruthy();
  });

  it("never renders retired 'Say YES' vocabulary", () => {
    renderPause();
    const root = screen.getByTestId("studio-v3-confirmation-pause");
    expect(root.textContent).not.toContain("Say YES");
    expect(root.textContent).not.toContain("Everything included");
  });

  it("primary CTA is a 52px touch target for mobile", () => {
    renderPause();
    const cta = screen.getByTestId("studio-v3-confirmation-continue");
    expect(cta.className).toContain("min-h-[52px]");
  });

  it("back link is a 44px touch target for a11y", () => {
    renderPause();
    const back = screen.getByTestId("studio-v3-confirmation-back");
    expect(back.className).toContain("min-h-[44px]");
  });

  it("respects a ctaLabel override for i18n", () => {
    renderPause({ ctaLabel: "Avançar para os meus dados" });
    const cta = screen.getByTestId("studio-v3-confirmation-continue");
    expect(cta.textContent).toContain("Avançar para os meus dados");
    expect(cta.textContent).not.toContain(CTA_PRIMARY);
  });
});
