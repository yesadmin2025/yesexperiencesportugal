import { createFileRoute } from "@tanstack/react-router";
import { MyToursContent, type GuideAlert } from "@/routes/guide.index";
import type { GuideTour } from "@/components/guide/guide-data";

export const Route = createFileRoute("/__guide-ux-preview")({ component: GuideUxPreview });

const makeTour = (id: string, date: string, title: string, itinerary: GuideTour["itinerary"] = []) : GuideTour => ({
  source_tour_id: null, assignment_id: id, booking_id: `mock-${id}`, tour_title: title,
  tour_date: date, start_time: "08:30", start_at: `${date}T08:30:00Z`, end_at: `${date}T16:30:00Z`,
  guests: 2, pax_breakdown: { adults: 2 }, language: "English", pickup_location: "VIP Executive Picoas, Lisbon",
  dropoff_location: null, guest_first_name: "John", guest_full_name: "John Smith", guest_phone: "+351 900 000 000",
  guest_email: "mock@example.com", itinerary, included_items: [], client_notes: null, status: "assigned",
  guide_viewed_at: null, guide_confirmed_at: null, changed_at: null, booking_cancelled: false,
});

const tours = [
  makeTour("today", "2026-09-30", "Sintra Private Day"),
  makeTour("one", "2026-10-08", "Arrábida Wine Tour"),
  makeTour("two", "2026-10-12", "Évora & Alentejo"),
  makeTour("three", "2026-10-19", "Tomar Private Day", null),
];
const alerts: GuideAlert[] = [{ id: "alert", title: "New assignment", message: "Please review and confirm your tour.", assignment_id: "today", notification_type: "assignment" }];

function GuideUxPreview() {
  return <main className="mx-auto min-h-screen max-w-xl bg-background px-4 py-5 pb-24"><MyToursContent tours={tours} alerts={alerts} today="2026-09-30" /></main>;
}