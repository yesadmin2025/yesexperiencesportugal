import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { SAMPLE_PAGES, TravelFilePreview } from "@/components/travel-designer/TravelFilePreview";

afterEach(cleanup);

describe("Travel Designer original book proof", () => {
  it("keeps the original sample immediately before the existing enquiry bridge", () => {
    const route = readFileSync("src/routes/portugal-travel-designer.tsx", "utf8");
    expect(route).toContain('id="sample-file"');
    expect(route).toContain("<TravelFilePreview />");
    const sample = route.indexOf("<TravelFilePreview />");
    expect(sample).toBeLessThan(route.indexOf("Designed and operated locally"));
    expect(sample).toBeGreaterThan(route.indexOf("Licensed Portuguese tour operator ·"));
    expect(route).toContain('href="#journey-enquiry"');
    expect(route).toContain("<JourneyEnquiryForm />");
  });

  it("retains all 23 original sample assets", () => {
    expect(SAMPLE_PAGES).toHaveLength(23);
    for (const page of SAMPLE_PAGES) expect(existsSync(`public${page.src}`)).toBe(true);
  });

  it("browses the original pages and opens and closes a full-size preview", () => {
    render(<TravelFilePreview />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Private Portugal travel file — page 2 full size" }));
    const dialog = screen.getByRole("dialog", { name: "Travel file page" });
    expect(dialog.querySelector("img")).toHaveAttribute("src", "/travel-file-sample/page-02.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByRole("button", { name: "Open Private Portugal travel file — page 1 full size" })).toBeInTheDocument();
  });
});