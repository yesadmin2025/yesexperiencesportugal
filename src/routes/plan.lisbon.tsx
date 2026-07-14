import { createFileRoute } from "@tanstack/react-router";
import { PlanningDestinationPage } from "@/components/planning/PlanningDestinationPage";
import { getPlanningDestination } from "@/content/planning/destinations";
import { destinationHead } from "@/lib/planning-head";

const SLUG = "lisbon";

export const Route = createFileRoute("/plan/lisbon")({
  head: () => destinationHead(getPlanningDestination(SLUG)!),
  component: () => <PlanningDestinationPage destination={getPlanningDestination(SLUG)!} />,
});
