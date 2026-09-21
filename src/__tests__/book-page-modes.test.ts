import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/routes/book.tsx", "utf8");

describe("/book mode separation", () => {
  it("derives instant mode only from the URL param", () => {
    expect(src).toMatch(/const instantTour = tourParam \? findTour\(tourParam\) : undefined/);
    expect(src).toMatch(/const instantMode = Boolean\(instantTour\)/);
  });

  it("keeps in-form request selection independent of the URL preselection", () => {
    expect(src).toMatch(/useState\(""\);\s*\n\s*const \[date/);
    expect(src).not.toMatch(/useState\(preselected\)/);
  });

  it("renders SimpleBookingForm only with the URL-preselected tour", () => {
    expect(src).toMatch(/<SimpleBookingForm tour=\{instantTour\} \/>/);
    expect(src).not.toMatch(/<SimpleBookingForm tour=\{chosenTour\}/);
  });

  it("does not render the request form in instant mode", () => {
    expect(src).toMatch(/\{!instantMode \? \(/);
  });

  it("offers a quiet private-day enquiry fallback in instant mode", () => {
    expect(src).toContain('data-testid="instant-enquiry-fallback"');
    expect(src).toMatch(/search=\{\{ type: "private_day" \}\}/);
  });

  it("offers a secondary instant-confirmation link once a request tour is chosen", () => {
    expect(src).toContain('data-testid="request-to-instant-link"');
  });

  it("sends the post-request instant action to /book with the chosen tour", () => {
    expect(src).toMatch(/to="\/book" search=\{\{ tour: chosenTour\.id \}\}/);
  });
});
