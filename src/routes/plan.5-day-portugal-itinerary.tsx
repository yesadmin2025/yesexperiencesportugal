import { createFileRoute } from "@tanstack/react-router";
import { PlanningItineraryPage } from "@/components/planning/PlanningItineraryPage";
import { getPlanningItinerary } from "@/content/planning/itineraries";
import { itineraryHead } from "@/lib/planning-head";

const SLUG = "5-day-portugal-itinerary";

export const Route = createFileRoute("/plan/5-day-portugal-itinerary")({
  head: () => itineraryHead(getPlanningItinerary(SLUG)!),
  component: () => <PlanningItineraryPage itinerary={getPlanningItinerary(SLUG)!} />,
});
