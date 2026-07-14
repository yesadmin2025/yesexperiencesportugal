import { createFileRoute } from "@tanstack/react-router";
import { PlanningDestinationPage } from "@/components/planning/PlanningDestinationPage";
import { getPlanningDestination } from "@/content/planning/destinations";
import { destinationHead } from "@/lib/planning-head";

const SLUG = "comporta";

export const Route = createFileRoute("/plan/comporta")({
  head: () => destinationHead(getPlanningDestination(SLUG)!),
  component: () => <PlanningDestinationPage destination={getPlanningDestination(SLUG)!} />,
});
