import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YourDayReserveBar } from "../YourDayReserveBar";
import { CTA_MAKE_IT_REAL } from "@/content/signature-day-copy";

describe("YourDayReserveBar — primary action always at hand", () => {
  it("shows the resolved total, date and party facts", () => {
    render(
      <YourDayReserveBar
        totalEur={458}
        dateLabel="Friday, 14 November"
        guestsLabel="2 guests (2 adults, 0 children)"
        visible={true}
        onReserve={() => {}}
      />,
    );
    expect(screen.getByTestId("studio-v3-reserve-bar-price").textContent).toContain("458");
    const facts = screen.getByTestId("studio-v3-reserve-bar-facts").textContent;
    expect(facts).toContain("Friday, 14 November");
    expect(facts).toContain("2 guests");
  });

  it("uses the canonical final-reveal CTA label, never a synonym", () => {
    render(
      <YourDayReserveBar
        totalEur={458}
        dateLabel={null}
        guestsLabel={null}
        visible={true}
        onReserve={() => {}}
      />,
    );
    expect(screen.getByTestId("studio-v3-reserve-bar-cta").textContent).toBe(CTA_MAKE_IT_REAL);
  });

  it("calls the same reserve handler as the surface CTA", () => {
    const onReserve = vi.fn();
    render(
      <YourDayReserveBar
        totalEur={458}
        dateLabel={null}
        guestsLabel={null}
        visible={true}
        onReserve={onReserve}
      />,
    );
    fireEvent.click(screen.getByTestId("studio-v3-reserve-bar-cta"));
    expect(onReserve).toHaveBeenCalledTimes(1);
  });

  it("is fully inert when the surface CTA is on-screen (one primary action rule)", () => {
    render(
      <YourDayReserveBar
        totalEur={458}
        dateLabel={null}
        guestsLabel={null}
        visible={false}
        onReserve={() => {}}
      />,
    );
    const bar = screen.getByTestId("studio-v3-reserve-bar");
    expect(bar.getAttribute("data-visible")).toBe("false");
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(bar.className).toContain("pointer-events-none");
    expect(screen.getByTestId("studio-v3-reserve-bar-cta").tabIndex).toBe(-1);
  });

  it("renders an em dash, never a invented number, when the total is unresolved", () => {
    render(
      <YourDayReserveBar
        totalEur={null}
        dateLabel="Flexible date"
        guestsLabel={null}
        visible={true}
        onReserve={() => {}}
      />,
    );
    expect(screen.getByTestId("studio-v3-reserve-bar-price").textContent).toBe("—");
  });
});
