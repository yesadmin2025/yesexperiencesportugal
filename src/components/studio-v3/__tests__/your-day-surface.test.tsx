/**
 * `Your Day` surface contract.
 *
 * Two things must hold no matter what the curation engine returns:
 *   1. The surface renders EITHER a real geographic map (every moment has
 *      real coordinates) OR a numbered editorial timeline. Never a
 *      silhouette standing in for a map we cannot honestly draw.
 *   2. The timeline preserves the exact moment order and shows only real
 *      names/copy.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MapAwakens } from "../MapAwakens";
import { YourDayTimeline } from "../YourDayTimeline";

describe("YourDayTimeline — editorial fallback", () => {
  const moments = [
    { label: "A quiet cellar", location: "Setúbal", story: "Barrels older than the road." },
    { label: "Lunch by the water", location: "Sesimbra" },
    { label: "The ridge road", location: "Arrábida" },
  ];

  it("numbers every moment in the given order", () => {
    render(<YourDayTimeline moments={moments} />);
    const list = screen.getByTestId("studio-v3-your-day-timeline");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.getAttribute("data-timeline-index"))).toEqual(["1", "2", "3"]);
    expect(items[0]).toHaveTextContent("01");
    expect(items[0]).toHaveTextContent("A quiet cellar");
    expect(items[2]).toHaveTextContent("The ridge road");
  });

  it("renders only supplied copy — no invented descriptions", () => {
    render(<YourDayTimeline moments={moments} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Barrels older than the road.");
    // Second moment has no story: nothing is fabricated to fill the slot.
    expect(items[1].textContent).toBe("02Lunch by the waterSesimbra");
  });

  it("is announced as an ordered list for assistive tech", () => {
    render(<YourDayTimeline moments={moments} />);
    expect(screen.getByLabelText("Your day, moment by moment").tagName).toBe("OL");
  });
});

beforeAll(() => {
  // jsdom has no matchMedia; the surface reads it for reduced-motion.
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }
  if (!("IntersectionObserver" in window)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    const ctor = IO as unknown as typeof globalThis.IntersectionObserver;
    (window as Window & typeof globalThis).IntersectionObserver = ctor;
    globalThis.IntersectionObserver = ctor;
  }
});

function renderMapAwakens() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MapAwakens
        feeling="wine-food"
        companions="couple"
        rhythm="slow"
        onBack={() => {}}
        onContinue={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe("MapAwakens — map vs timeline", () => {
  it("resolves to exactly one truthful mode and never fakes a map", () => {
    renderMapAwakens();

    const stage = screen.getByTestId("studio-v3-your-day-stage");
    const mode = stage.getAttribute("data-your-day-mode");
    expect(["map", "timeline"]).toContain(mode);

    if (mode === "timeline") {
      // The silhouette is a pre-map anticipation device only. With no
      // coordinates it must not appear at all.
      expect(screen.getByTestId("studio-v3-your-day-timeline")).toBeInTheDocument();
      expect(screen.queryByTestId("studio-v3-map-anticipation")).toBeNull();
    } else {
      expect(screen.queryByTestId("studio-v3-your-day-timeline")).toBeNull();
    }
  });

  it("keeps the continue CTA reachable before any autoplay completes", () => {
    renderMapAwakens();
    const cta = screen.getByRole("button", { name: /Personalise a few details/i });
    expect(cta).toBeEnabled();
  });
});
