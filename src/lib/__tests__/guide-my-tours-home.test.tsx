import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MyToursContent, type GuideAlert } from "@/routes/guide.index";
import type { GuideTour } from "@/components/guide/guide-data";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> };
});

function tour(id: string, date: string, title: string, itinerary: GuideTour["itinerary"] = []) : GuideTour {
  return {
    source_tour_id: null, assignment_id: id, booking_id: `booking-${id}`, tour_title: title,
    tour_date: date, start_time: "08:30", start_at: `${date}T08:30:00Z`, end_at: `${date}T16:30:00Z`,
    guests: 2, pax_breakdown: { adults: 2 }, language: "English", pickup_location: "VIP Executive Picoas",
    dropoff_location: null, guest_first_name: "John", guest_full_name: "John Smith", guest_phone: "+351900000000",
    guest_email: "guide-test@example.com", itinerary, included_items: [], client_notes: null, status: "assigned",
    guide_viewed_at: null, guide_confirmed_at: null, changed_at: null, booking_cancelled: false,
  };
}

describe("My Tours signed-in state", () => {
  it("makes today's work and at least three concrete future tours immediately visible", () => {
    const alerts: GuideAlert[] = [{ id: "a1", title: "New assignment", message: "Please review your tour.", assignment_id: "today", notification_type: "assignment" }];
    render(<MyToursContent tours={[
      tour("today", "2026-09-30", "Sintra Private Day"),
      tour("future-1", "2026-10-08", "Arrábida Wine Tour"),
      tour("future-2", "2026-10-12", "Évora & Alentejo"),
      tour("future-3", "2026-10-19", "Tomar Private Day", null),
    ]} alerts={alerts} today="2026-09-30" />);

    expect(screen.getByRole("heading", { name: "My Tours" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Upcoming" })).toBeTruthy();
    expect(screen.getByText("New assignment")).toBeTruthy();
    expect(screen.getByText(/Wed, 30 Sept · 08:30/)).toBeTruthy();
    expect(screen.getByText(/Thu, 8 Oct · 08:30/)).toBeTruthy();
    expect(screen.getByText("Arrábida Wine Tour")).toBeTruthy();
    expect(screen.getAllByText("John Smith · 2 guests")).toHaveLength(4);
    expect(screen.getAllByText("VIP Executive Picoas")).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: "View details" })).toHaveLength(4);
  });
});