import type { OptionalStopType } from "@/data/regionStopPool";

export type LivingAtlasPublicMoment = {
  stopId: string;
  label: string;
  type: OptionalStopType;
};

export const LIVING_ATLAS_TIMING_DISCLOSURE =
  "Exact timings and visit order may adjust, while the selected content of the day is preserved.";

export function livingAtlasPublicMomentLabel(
  moment: LivingAtlasPublicMoment,
  wineryPosition = 1,
  wineryCount = 1,
): string {
  if (moment.type === "winery") {
    return wineryCount > 1
      ? `Selected regional winery ${wineryPosition}`
      : "Selected winery in the region";
  }
  if (moment.type === "boat") return "Coastal boat experience in Sesimbra";
  return moment.label;
}

export function livingAtlasMomentDisclosure(moment: LivingAtlasPublicMoment): string | null {
  if (moment.type === "winery") {
    return "An accredited winery in the region is included and confirmed with your booking. You can add winery preferences at checkout.";
  }
  if (moment.type === "boat") {
    return "Subject to sea and weather conditions.";
  }
  if (moment.stopId === "mercado-do-livramento") {
    return "Morning visit. Closed on Mondays.";
  }
  return null;
}
