import { createFileRoute } from "@tanstack/react-router";
import { PlanningDestinationPage } from "@/components/planning/PlanningDestinationPage";
import { getPlanningDestination } from "@/content/planning/destinations";
import { destinationHead } from "@/lib/planning-head";

const SLUG = "alentejo";

export const Route = createFileRoute("/plan/alentejo")({
  head: () => destinationHead(getPlanningDestination(SLUG)!),
  component: () => <PlanningDestinationPage destination={getPlanningDestination(SLUG)!} />,
});
