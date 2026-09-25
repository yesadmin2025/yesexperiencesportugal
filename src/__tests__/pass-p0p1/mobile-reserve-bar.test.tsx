import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MobileReserveBar } from "@/components/booking/MobileReserveBar";

describe("MobileReserveBar", () => {
  it("shows immediately (no hero scroll) when #book is off screen and no cookie notice", async () => {
    const book = document.createElement("div");
    book.id = "book";
    book.getBoundingClientRect = () => ({ top: 5000, bottom: 5600 }) as DOMRect;
    document.body.appendChild(book);
    render(<MobileReserveBar tourId="sintra-cascais" priceFrom={161} />);
    await act(async () => {});
    expect(screen.getByTestId("mobile-reserve-bar").getAttribute("aria-hidden")).toBe("false");
  });

  it("stays hidden while the cookie notice owns the bottom edge", async () => {
    const notice = document.createElement("div");
    notice.className = "cookie-consent-card";
    document.body.appendChild(notice);
    render(<MobileReserveBar tourId="x" />);
    await act(async () => {});
    expect(screen.getAllByTestId("mobile-reserve-bar").at(-1)!.getAttribute("aria-hidden")).toBe("true");
    notice.remove();
  });
});
