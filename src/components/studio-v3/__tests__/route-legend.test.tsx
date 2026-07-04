/**
 * RouteLegend — renders per-leg minutes, distance and travel mode.
 *
 * These tests lock the contract the reveal + design maps depend on:
 *   - one row per leg
 *   - correct icon per mode (driving vs walking, via aria-label)
 *   - metre formatting for sub-km walking legs, km formatting otherwise
 *   - "driving" / "walking" totals in the footer
 *   - hides itself when there are no minutes
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteLegend } from "@/components/studio-v3/RouteLegend";

describe("<RouteLegend />", () => {
  const originLabel = "Lisbon · Alfama";
  const stopLabels = ["Cabo Espichel", "Sesimbra", "Arrábida viewpoint"];

  it("renders one row per leg with minutes, distance and correct mode icon", () => {
    render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={stopLabels}
        legMinutes={[42, 8, 6]}
        legDistancesKm={[38.2, 6.4, 0.25]}
        legModes={["driving", "driving", "walking"]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);

    // Leg 1 — long drive
    expect(within(items[0]).getByLabelText("Driving leg")).toBeInTheDocument();
    expect(items[0].textContent).toContain("Lisbon · Alfama");
    expect(items[0].textContent).toContain("Cabo Espichel");
    expect(items[0].textContent).toContain("42 min");
    expect(items[0].textContent).toContain("38.2 km");

    // Leg 3 — short walk, formatted in metres
    expect(within(items[2]).getByLabelText("Walking leg")).toBeInTheDocument();
    expect(items[2].textContent).toContain("6 min");
    expect(items[2].textContent).toMatch(/250 m/);
  });

  it("summarises transit total and driving/walking counts", () => {
    render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={stopLabels}
        legMinutes={[10, 5, 3]}
        legDistancesKm={[9, 4, 0.3]}
        legModes={["driving", "driving", "walking"]}
      />,
    );

    // 10 + 5 + 3 = 18 min, 9 + 4 + 0.3 = 13.3 km
    expect(screen.getByText(/18 min in transit/)).toBeInTheDocument();
    expect(screen.getByText(/13\.3 km/)).toBeInTheDocument();
    expect(screen.getByText(/2 driving · 1 walking/i)).toBeInTheDocument();
  });

  it("treats missing modes as driving so the icon never disappears", () => {
    render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={["Sesimbra"]}
        legMinutes={[20]}
        legDistancesKm={[15]}
        legModes={null}
      />,
    );

    expect(screen.getByLabelText("Driving leg")).toBeInTheDocument();
    expect(screen.queryByLabelText("Walking leg")).not.toBeInTheDocument();
  });

  it("hides distance column but still renders leg rows when distances are unknown", () => {
    render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={["Sesimbra", "Arrábida"]}
        legMinutes={[12, 9]}
        legDistancesKm={null}
        legModes={["driving", "walking"]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("12 min");
    expect(items[0].textContent).not.toMatch(/km|\bm\b/);
  });

  it("renders nothing when there are no legs", () => {
    const { container } = render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={[]}
        legMinutes={[]}
        legDistancesKm={[]}
        legModes={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a single-mode footer when every leg shares one mode", () => {
    render(
      <RouteLegend
        originLabel={originLabel}
        stopLabels={["Cabo Espichel", "Sesimbra"]}
        legMinutes={[30, 12]}
        legDistancesKm={[26, 8]}
        legModes={["driving", "driving"]}
      />,
    );
    expect(screen.getByText(/^2 driving$/)).toBeInTheDocument();
    expect(screen.queryByText(/walking/i)).not.toBeInTheDocument();
  });
});
