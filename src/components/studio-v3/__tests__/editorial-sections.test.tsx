/**
 * Step 6 — smoke tests for the 5 new editorial reveal sections.
 *
 * These components are pure presentational modules with no wiring into
 * StudioV3 yet. The tests here lock in three invariants each:
 *   1. Renders when given valid content.
 *   2. Renders nothing when given empty content (no hollow sections in
 *      the reveal — protects the 4–6 viewport budget in plan §E).
 *   3. Respects any documented cap (Why Route Works ≤ 4, Designed for You ≤ 3).
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { DayAtGlance } from "../DayAtGlance";
import { RhythmRibbon } from "../RhythmRibbon";
import { WhyRouteWorks } from "../WhyRouteWorks";
import { DesignedForYou } from "../DesignedForYou";
import { ReassuranceStrip } from "../ReassuranceStrip";
import { REASSURANCE_DEFAULT } from "@/content/signature-day-copy";

describe("Step 6 · editorial reveal sections", () => {
  describe("DayAtGlance", () => {
    it("renders chip label + value", () => {
      render(
        <DayAtGlance
          chips={[
            { key: "stops", label: "Stops", value: "5" },
            { key: "driving", label: "Driving", value: "1h 40m", hint: "22% of the day" },
          ]}
        />,
      );
      const region = screen.getByTestId("studio-v3-day-at-glance");
      expect(within(region).getByText("Stops")).toBeInTheDocument();
      expect(within(region).getByText("1h 40m")).toBeInTheDocument();
      expect(within(region).getByText("22% of the day")).toBeInTheDocument();
    });
    it("renders nothing when no chips", () => {
      const { container } = render(<DayAtGlance chips={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("RhythmRibbon", () => {
    it("renders stops and driving minutes between them", () => {
      render(
        <RhythmRibbon
          stops={[
            { label: "Lisbon pickup", daypart: "Morning" },
            { label: "Sintra", daypart: "Midday" },
            { label: "Cascais", daypart: "Sunset" },
          ]}
          legMinutes={[45, 30]}
        />,
      );
      const region = screen.getByTestId("studio-v3-rhythm-ribbon");
      expect(within(region).getByText("Lisbon pickup")).toBeInTheDocument();
      expect(within(region).getByText("Cascais")).toBeInTheDocument();
      expect(within(region).getByText("45m")).toBeInTheDocument();
      expect(within(region).getByText("30m")).toBeInTheDocument();
    });
    it("renders nothing with fewer than 2 stops", () => {
      const { container } = render(<RhythmRibbon stops={[{ label: "solo" }]} />);
      expect(container).toBeEmptyDOMElement();
    });
    it("falls back to 'drive' when leg minutes are missing", () => {
      render(<RhythmRibbon stops={[{ label: "A" }, { label: "B" }]} />);
      expect(screen.getByText("drive")).toBeInTheDocument();
    });
  });

  describe("WhyRouteWorks", () => {
    it("renders up to 4 reasons and drops empties", () => {
      render(
        <WhyRouteWorks
          reasons={[
            "Stays inside a coherent Lisbon-to-Cascais arc.",
            "Driving under 25% of the day.",
            "Sunset in Cabo da Roca aligns with your rhythm.",
            "Every stop is open on your travel date.",
            "This fifth reason must be dropped.",
            "   ",
          ]}
        />,
      );
      const region = screen.getByTestId("studio-v3-why-route-works");
      const items = within(region).getAllByRole("listitem");
      expect(items).toHaveLength(4);
      expect(within(region).queryByText("This fifth reason must be dropped.")).toBeNull();
    });
    it("renders nothing when reasons are empty", () => {
      const { container } = render(<WhyRouteWorks reasons={["", "   "]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("DesignedForYou", () => {
    it("renders up to 3 curator notes and the anonymous attribution", () => {
      render(
        <DesignedForYou
          notes={[
            "We paced the day slower for your parents.",
            "The winery moved to lunch so the afternoon breathes.",
            "Sintra is booked at the quietest window.",
            "Extra note that should not render.",
          ]}
        />,
      );
      const region = screen.getByTestId("studio-v3-designed-for-you");
      expect(within(region).getAllByRole("listitem")).toHaveLength(3);
      expect(within(region).queryByText("Extra note that should not render.")).toBeNull();
      expect(within(region).getByText(/YES curator/)).toBeInTheDocument();
    });
    it("renders nothing when no notes", () => {
      const { container } = render(<DesignedForYou notes={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("ReassuranceStrip", () => {
    it("renders the default reassurance items when none passed", () => {
      render(<ReassuranceStrip />);
      const region = screen.getByTestId("studio-v3-reassurance-strip");
      for (const item of REASSURANCE_DEFAULT) {
        expect(within(region).getByText(item.label)).toBeInTheDocument();
      }
    });
    it("respects a custom items list", () => {
      render(
        <ReassuranceStrip
          items={[{ key: "x", label: "Only me", detail: "and only this line." }]}
        />,
      );
      const region = screen.getByTestId("studio-v3-reassurance-strip");
      expect(within(region).getByText("Only me")).toBeInTheDocument();
      expect(within(region).queryByText(REASSURANCE_DEFAULT[0].label)).toBeNull();
    });
    it("renders nothing when items list is empty", () => {
      const { container } = render(<ReassuranceStrip items={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
